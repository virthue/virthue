/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import {
    app as Application,
    BrowserWindow,
    ipcMain as IPC
} from 'electron';
import Utils from '../Utils.js';

export default new class Traffic {
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
        IPC.on('traffic', (event, packet) => {
            switch (packet.action) {
                case 'INIT':
                    /*this.send('VIRTHUE', {
                        version: packages?.version || 'N/A',
                        electron: Process?.versions?.electron || 'N/A',
                        node: Process?.versions?.node || 'N/A'
                    });

                    this.send('SETTINGS', this.Bridge.getConfiguration().toJSON());
                    this.send('ACCOUNTS', this.Bridge.getAuthentication().toJSON());*/
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

        this.Window.loadURL(`file://${Utils.getPath('assets', 'window', 'Traffic.html')}`);
        //this.Window.setMenu(null);
        this.Window.setIcon(Utils.getPath('assets', 'icons', 'logo.ico'));

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

        this.Window.webContents.send('traffic', {
            action: name,
            data
        });
    }
}()