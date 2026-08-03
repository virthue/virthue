/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import Path from 'node:path';
import FileSystem from 'node:fs/promises';
import FSCore from 'node:fs';
import Crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import Logger from '../utils/Logger.js';
import User from './User.js';
import { ErrorCode } from './objects/index.js';

/*
* @Docs https://developers.meethue.com/develop/hue-api/7-configuration-api/
*/
export default class Authentication extends EventEmitter {
    Bridge              = null;
    Users              = [];
    usersFilePath       = null;
    fileWatcher         = null;
    saveDebounceTimer   = null;
    isExternalChange = false;

    constructor(bridge) {
        super();

        this.Bridge         = bridge;
        this.usersFilePath  = Path.join(process.cwd(), '.data', 'Users.json');
    }

    async loadUsers() {
        try {
            const data = await FileSystem.readFile(this.usersFilePath, 'utf8');

            if(!data || data.trim() === '') {
                if(this.Bridge.getConfiguration().supports('developer')) {
                    Logger.info('Auth', 'Users.json is empty, creating default root user');
                    this.#createUser('root').setToken('root');
                }

                await this.#saveUsersInternal();
                this.#startFileWatcher();
                this.emit('loaded');
                return;
            }

            const usersData = JSON.parse(data);

            if(!usersData || typeof usersData !== 'object' || Object.keys(usersData).length === 0) {
                this.Users = [];

                if(this.Bridge.getConfiguration().supports('developer')) {
                    Logger.info('Auth', 'Users.json is invalid or empty, creating default root user');
                    this.#createUser('root').setToken('root');
                }

                await this.#saveUsersInternal();
            } else {
                Object.entries(usersData).forEach(([token, userData]) => {
                    const user = new User();
                    user.setName(userData.name || 'unknown');
                    user.setToken(token);

                    if(userData.clientkey) {
                        user.setClientKey(userData.clientkey);
                    }

                    this.Users.push(user);
                });
            }
        } catch (error) {
            if(error.code === 'ENOENT') {
                if(this.Bridge.getConfiguration().supports('developer')) {
                    Logger.info('Auth', 'No Users.json found, creating default root user');
                    this.#createUser('root').setToken('root');
                }

                await this.#saveUsersInternal();
                this.#startFileWatcher();
                this.emit('loaded');
                return;
            }

            Logger.error('Auth', 'Failed to load users:', error.message);
            this.Users = [];

            if(this.Bridge.getConfiguration().supports('developer')) {
                Logger.info('Auth', 'Creating default root user as fallback');
                this.#createUser('root').setToken('root');
            }

            await this.#saveUsersInternal();
        }

        if(!this.Bridge.getConfiguration().supports('developer')) {
            const rootUser = this.Users.find(user => user.getName() === 'root');
            if(rootUser) {
                Logger.info('Auth', 'Developer mode disabled, removing root user');
                this.#removeUser('root');
                await this.#saveUsersInternal();
            }
        }

        this.#startFileWatcher();
        this.emit('loaded');
    }

    async saveUsers() {
        if(this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }

        this.saveDebounceTimer = setTimeout(() => {
            this.#saveUsersInternal();
        }, 300);
    }

    getCount() {
        return this.Users.length;
    }

    async #saveUsersInternal() {
        const tempFilePath = `${this.usersFilePath}.${Crypto.randomBytes(4).toString('hex')}`;

        try {
            const usersData = this.toJSON();
            await FileSystem.writeFile(tempFilePath, JSON.stringify(usersData, null, 2));
            this.isExternalChange = true;
            await FileSystem.rename(tempFilePath, this.usersFilePath);
            this.isExternalChange = false;
            this.emit('saved');
        } catch (error) {
            Logger.error('Auth', 'Failed to save users:', error.message);

            try {
                await FileSystem.unlink(tempFilePath);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    }

    #startFileWatcher() {
        try {
            const dataDir  = Path.dirname(this.usersFilePath);
            const fileName = Path.basename(this.usersFilePath);

            this.fileWatcher = FSCore.watch(dataDir, async (eventType, filename) => {
                if(filename !== fileName) {
                    return;
                }

                if(this.isExternalChange) {
                    return;
                }

                if(eventType === 'change') {
                    Logger.info('Auth', 'Users.json changed externally, reloading...');
                    await this.#reloadUsersFromDisk();
                }
            });
        } catch (error) {
            Logger.warn('Auth', 'Failed to start file watcher:', error.message);
        }
    }

    async #reloadUsersFromDisk() {
        try {
            const data  = await FileSystem.readFile(this.usersFilePath, 'utf8');
            const usersData    = JSON.parse(data);
            this.Users         = [];

            Object.entries(usersData).forEach(([token, userData]) => {
                const user = new User();
                user.setName(userData.name || 'unknown');
                user.setToken(token);

                if(userData.clientkey) {
                    user.setClientKey(userData.clientkey);
                }

                this.Users.push(user);
            });

            Logger.info('Auth', 'Users reloaded from disk');
            this.emit('reloaded');
        } catch (error) {
            Logger.error('Auth', 'Failed to reload users from disk:', error.message);
        }
    }

    destroy() {
        if(this.fileWatcher) {
            this.fileWatcher.close();
        }

        if(this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
    }

    /**
     *  @swagger
     *  @category Authentication
     **/
    async onRequest(request, response) {
        if(!request.body?.devicetype) {
            return response.error(ErrorCode.MISSING_MANDATORY_PARAMETER, request.getPath(), 'invalid/missing parameters in body');
        }

        if(!this.Bridge.getLinkButton().getState()) {
            return response.error(ErrorCode.LINK_BUTTON_NOT_PRESSED, request.getPath(), 'link button not pressed');
        }

        this.Bridge.getLinkButton().deactivate();

        let user = this.#createUser(request.body?.devicetype);

        if(!user.hasToken()) {
            user.generateToken();
        }

        if(request?.body?.generateclientkey) {
            user.generateClientKey();
        }

        return response.send([{
            success: {
                username: user.getToken(),
                ...(user.hasClientKey() ? {
                    clientkey: user.getClientKey()
                } : null)
            }
        }]);
    }

    async checkAuth(request, reply) {
        const { token } = request.params;

        request.authenticated = false;

        if(!this.Users.some(user => user.getToken() === token)) {
            return reply.error(ErrorCode.UNAUTHORIZED_USER, request.url.replace(`/api/${token}`, ''), 'unauthorized user');
        }

        request.authenticated = true;

        this.Users.find(user => user.getToken() === token).DateLastUsed = new Date();
    }

    tokenExists(token) {
        return this.Users.some(user => user.getToken() === token);
    }

    provisionUser(deviceType, generateClientKey = false) {
        const user = this.#createUser(deviceType, false);

        if(!user.hasToken()) {
            user.generateToken();
        }

        if(generateClientKey) {
            user.generateClientKey();
        }

        this.saveUsers().catch(error => {
            Logger.error('Auth', 'Failed to save provisioned user:', error.message);
        });

        return user;
    }

    #createUser(name, autoSave = true) {
        const user = new User();

        user.setName(name);

        this.Users.push(user);

        if(autoSave) {
            this.saveUsers().catch(error => {
                Logger.error('Auth', 'Failed to auto-save user:', error.message);
            });
        }

        return user;
    }

    #removeUser(name, autosave = true) {
        this.Users = this.Users.filter(user => user.getName() !== name);

        if(autoSave) {
            this.saveUsers().catch(error => {
                Logger.error('Auth', 'Failed to auto-save user:', error.message);
            });
        }
    }

    toJSON() {
        return this.Users.reduce((users, user) => {
            users[user.getToken()] = user.toJSON();
            return users;
        }, {});
    }
}
