import {
    app as Application,
    BrowserWindow,
    ipcMain as IPC,
    shell as Shell
} from 'electron';
import Utils from '../Utils.js';
import FileSystem from 'node:fs';
import Process from 'node:process';

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
            packages =  JSON.parse(FileSystem.readFileSync(Utils.getPath('package.json')));
        } catch(error) {
            /* Do Nothing */
        }

        IPC.on('settings', (event, packet) => {
            switch(packet.action) {
                case 'INIT':
                    this.send('VIRTHUE', {
                        version:    packages?.version || 'N/A',
                        electron:   Process?.versions?.electron || 'N/A',
                        node:       Process?.versions?.node || 'N/A'
                    });

                    this.send('SETTINGS', this.Bridge.getConfiguration().toJSON());
                    this.send('ACCOUNTS', this.Bridge.getAuthentication().toJSON());
                break;
                case 'URL_OPEN':
                    switch(packet.data?.data) {
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
            }
        });

        if(!this.Window) {
            this.Window = new BrowserWindow({
                width: this.Size.width,
                height: this.Size.height,
                minWidth: this.Size.width,
                minHeight: (this.Size.height / 2),
                show: false,
                frame: true,
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
            //this.Window.setMenu(null);
            this.Window.setIcon(Utils.getPath('assets', 'icons', 'logo.ico'));
        }
    }

    show() {
        this.Window.show();
    }

    send(name, data) {
        if(!this.Window) {
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