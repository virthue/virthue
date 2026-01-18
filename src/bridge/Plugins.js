/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import URL from 'node:url';
import Utils from '../Utils.js';

export default class Plugins {
    Bridge           = null;
    Path             = null;
    Plugins = new Map();

    constructor(bridge) {
        this.Bridge     = bridge;
        this.Path       = Utils.getPath('src', 'plugins');
    }

    async loadPlugins() {
        for(const entry of await FileSystem.readdir(this.Path , {
            withFileTypes: true
        })) {
            if(entry.isDirectory()) {
                const pluginPath = Path.join(this.Path , entry.name, 'plugin.js');

                try {
                    const pluginURL  = URL.pathToFileURL(pluginPath).href;
                    const PluginClass       = (await import(pluginURL)).default;
                    const instance          = new PluginClass(this);

                    this.Plugins.set(entry.name.toLowerCase(), instance);
                } catch (err) {
                    console.error(`Failed to load plugin ${entry.name}:`, err);
                }
            }
        }
    }

    getBridge() {
        return this.Bridge;
    }

    getCount() {
        return this.Plugins.size;
    }

    getPlugin(name) {
        return this.Plugins.get(name.toLowerCase());
    }

    registerV1Routes(server, authentication) {
        const preHandler = async (request, reply) => await authentication.checkAuth(request, reply);

        // GET /api/:token/:plugin
        server.add().get('/api/:token/:plugin', { preHandler }, async (request, reply) => this.onHandle('getAll', request, reply));

        // POST /api/:token/:plugin
        server.add().post('/api/:token/:plugin', { preHandler }, async (request, reply) => this.onHandle('create', request, reply));

        // GET /api/:token/:plugin/:id/*
        server.add().get('/api/:token/:plugin/:id/*', { preHandler }, async (request, reply) => this.onHandle('getCustom', request, reply));

        // POST /api/:token/:plugin/:id/*
        server.add().post('/api/:token/:plugin/:id/*', { preHandler }, async (request, reply) => this.onHandle('createCustom', request, reply));

        // PUT /api/:token/:plugin/:id/*
        server.add().put('/api/:token/:plugin/:id/*', { preHandler }, async (request, reply) => this.onHandle('updateCustom', request, reply));

        // DELETE /api/:token/:plugin/:id/*
        server.add().delete('/api/:token/:plugin/:id/*', { preHandler }, async (request, reply) => this.onHandle('deleteCustom', request, reply));

        // GET /api/:token/:plugin/:id (mit dynamischer Resource-Erkennung)
        server.add().get('/api/:token/:plugin/:id', { preHandler }, async (request, reply) => {
            const plugin = this.getPlugin(request.params.plugin);

            if(!plugin) {
                return this.notFound(request, reply);
            }

            const id                = request.params.id;
            const isNumeric = /^\d+$/.test(id);

            if(isNumeric && plugin.getElement) {
                const element = plugin.getElement(request, reply);

                if(!element) {
                    return this.notFound(request, reply);
                }

                return element;
            }

            if(plugin.getResource) {
                const resource = plugin.getResource(request, reply);

                if(!resource) {
                    return this.notFound(request, reply);
                }

                return resource;
            }

            if(plugin.getElement) {
                const element = plugin.getElement(request, reply);

                if(!element) {
                    return this.notFound(request, reply);
                }

                return element;
            }

            return this.notFound(request, reply);
        });

        // POST /api/:token/:plugin/:id
        server.add().post('/api/:token/:plugin/:id', { preHandler }, async (request, reply) => this.onHandle('createElement', request, reply));

        // PUT /api/:token/:plugin/:id
        server.add().put('/api/:token/:plugin/:id', { preHandler }, async (request, reply) => this.onHandle('updateElement', request, reply));

        // DELETE /api/:token/:plugin/:id
        server.add().delete('/api/:token/:plugin/:id', { preHandler }, async (request, reply) => this.onHandle('deleteElement', request, reply));
    }

    onHandle(method, request, reply) {
        const plugin = this.getPlugin(request.params.plugin);

        if (!plugin || !plugin[method]) {
            return this.notFound(request, reply);
        }

        return plugin[method](request, reply);
    }

    notFound(request, reply) {
        return reply.send([{
            error: {
                type:           4,
                address:        request.url,
                description:    `method, ${request.method}, not available for resource, ${request.url}`
            }
        }]);
    }
}