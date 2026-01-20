/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import {
    app as Application,
    BrowserWindow,
    ipcMain as IPC,
    shell as Shell
} from 'electron';
import Utils from '../Utils.js';
import FileSystem from 'node:fs';
import Process from 'node:process';
import Support from '../types/Support.js';
import Traffic from './Traffic.js';
import ElectronUtils from '../ElectronUtils.js';

export default new class Settings {
    Window = null;
    Bridge = null;
    Size = {
        width:  500,
        height: 550
    };

    start(bridge) {
        this.Bridge = bridge;

        if(Application.isReady()) {
            this.init();
        } else {
            Application.on('ready', () => {
                this.init();
            });
        }
    }

    init() {
        let packages;

        try {
            packages = JSON.parse(FileSystem.readFileSync(Utils.getPath('package.json')));
        } catch (error) {
            /* Do Nothing */
        }

        IPC.on('settings', (event, packet) => {
            switch (packet.action) {
                case 'INIT':
                    this.send('VIRTHUE', {
                        version:    packages?.version || 'N/A',
                        electron:   Process?.versions?.electron || 'N/A',
                        node:       Process?.versions?.node || 'N/A'
                    });

                    this.send('SETTINGS', {
                        id: this.Bridge.getId(),
                        ...(this.Bridge.getConfiguration().toJSON())
                    });

                    this.send('ACCOUNTS', this.Bridge.getAuthentication().toJSON());
                break;
                case 'TRAFFIC_OPEN':
                    Traffic.show(this.Bridge);
                break;
                case 'URL_OPEN':
                    switch (packet.data?.data) {
                        case 'URL_PHILIPS':
                            Shell.openPath('https://www.philips.de');
                        break;
                        case 'URL_PHILIPS_LIGTHNING':
                            Shell.openPath('https://www.lighting.philips.de/prof');
                        break;
                        case 'URL_PHILIPS_HUE':
                            Shell.openPath('https://www.philips-hue.com/');
                        break;
                        case 'URL_SIGNIFY':
                            Shell.openPath('https://www.signify.com/');
                        break;
                        case 'GITHUB_ISSUE':
                            Shell.openPath('https://github.com/virthue/virthue/issues');
                        break;
                        case 'GITHUB_REPOSITORY':
                            Shell.openPath('https://github.com/virthue/virthue');
                        break;
                        default:
                            console.warn('Unknown URL instruction:', packet.data);
                        break;
                    }
                break;
                case 'SETTINGS_SAVE':
                    let restart = false;

                    switch (packet.data?.target) {
                        case 'bridge':
                            if (packet.data?.model) {
                                this.Bridge.getConfiguration().setModel(packet.data?.model);
                            }

                            if (packet.data?.name) {
                                this.Bridge.getConfiguration().setName(packet.data?.name);
                            }

                            if (packet.data?.mac) {
                                this.Bridge.getConfiguration().setMACAddress(packet.data?.mac);
                            }

                            if (packet.data?.port && this.Bridge.getConfiguration().getPort() !== Number(packet.data.port)) {
                                this.Bridge.getConfiguration().setPort(packet.data.port);
                                restart = true;
                            }

                            if (packet.data?.tls && this.Bridge.getConfiguration().getSecuredPort() !== Number(packet.data.tls)) {
                                this.Bridge.getConfiguration().setSecuredPort(packet.data.tls);
                                restart = true;
                            }

                            this.Bridge.getConfiguration().store();
                        break;
                        case 'flags':
                            let old_secured = this.Bridge.getConfiguration().supports(Support.SECURED);
                            let old_description = this.Bridge.getConfiguration().supports(Support.DESCRIPTION);

                            for(const support in Support) {
                                let value = Support[support];
                                let active = (typeof (packet.data[value]) !== 'undefined');

                                if(active) {
                                    this.Bridge.getConfiguration().addSupportFlag(value);
                                } else {
                                    this.Bridge.getConfiguration().removeSupportFlag(value);
                                }

                                if(value === Support.SECURED && old_secured !== active) {
                                    restart = true;
                                }

                                if(value === Support.DESCRIPTION && old_description !== active) {
                                    restart = true;
                                }
                            }

                            this.Bridge.getConfiguration().store();
                        break;
                    }

                    if(restart) {
                        // @ToDo: Restart Bridge
                        console.log('Restarting Bridge...');
                    }
                break;
            }
        });

        this.#createWindow();
    }

    #createWindow() {
        if(this.Window && !this.Window.isDestroyed()) {
            return;
        }

        this.Window = new BrowserWindow({
            width:      this.Size.width,
            height:     this.Size.height,
            minWidth:   this.Size.width,
            minHeight:  (this.Size.height / 2),
            show:       false,
            frame:      true,
            fullscreenable: false,
            resizable: true,
            transparent: false,
            webPreferences: {
                preload: Utils.getPath('src', 'ui', 'Preload.js'),
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        this.Window.loadURL(`file://${Utils.getPath('assets', 'window', 'Settings.html')}`);
        this.Window.setMenu(null);

        this.Window.setIcon(ElectronUtils.getIcon('logo', true));

        this.Window.on('closed', () => {
            this.Window = null;
        });
    }

    show() {
        this.#createWindow();

        this.Window.show();
    }

    send(name, data) {
        if(!this.Window || this.Window.isDestroyed()) {
            return;
        }

        if(typeof(data) === 'string') {
            data = {
                data: data
            };
        }

        this.Window.webContents.send('settings', {
            action: name,
            data
        });
    }
}()