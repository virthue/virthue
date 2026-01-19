/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import {
    app as Application,
    Tray,
    Menu,
    BrowserWindow,
    nativeImage as NativeImage,
    ipcMain as IPC,
    screen as Screen
} from 'electron';
import Process from 'node:process';
import QRCode from 'qrcode';
import Utils, { System } from '../Utils.js';
import Events from '../types/Events.js';
import Settings from './Settings.js';
import Traffic from './Traffic.js';

export default new class TrayManager {
    Bridge                  = null;
    Tray                    = null;
    Window                  = null;
    Menu                    = null;
    Size = {
        width:  326,
        height: 569
    };

    constructor() {
        this.Tray   = null;
    }

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
        if(this.Tray !== null) {
            return;
        }

        //Application.dock.hide()
        const icon = NativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAACTSURBVHgBpZKBCYAgEEV/TeAIjuIIbdQIuUGt0CS1gW1iZ2jIVaTnhw+Cvs8/OYDJA4Y8kR3ZR2/kmazxJbpUEfQ/Dm/UG7wVwHkjlQdMFfDdJMFaACebnjJGyDWgcnZu1/lrCrl6NCoEHJBrDwEr5NrT6ko/UV8xdLAC2N49mlc5CylpYh8wCwqrvbBGLoKGvz8Bfq0QPWEUo/EAAAAASUVORK5CYII=')

        this.Tray   = new Tray(icon); //Utils.getPath('assets', 'icons', 'logo.' + (Utils.getOS() === System.MAC ? 'svg' : 'ico')));
        this.Menu   = Menu.buildFromTemplate([{
                label: 'Show Bridge',
                icon: '', //NativeImage.createFromPath(Utils.getPath('assets', 'icons', 'bridge.' + (Utils.getOS() === System.MAC ? 'svg' : 'ico'))).resize({ width: 16, height: 16 }),
                click: () => {
                    this.showWindow();
                }
            }, {
                id: 'button',
                label: 'Press Link-Button',
                icon: '', //NativeImage.createFromPath(Utils.getPath('assets', 'icons', 'button.' + (Utils.getOS() === System.MAC ? 'svg' : 'ico'))).resize({ width: 16, height: 16 }),
                enabled: true,
                click: () => {
                    this.Bridge.getLinkButton().activate();
                }
            }, {
                type: 'separator'
            }, {
                label: 'Settings',
                icon: '', //NativeImage.createFromPath(Utils.getPath('assets', 'icons', 'settings.' + (Utils.getOS() === System.MAC ? 'svg' : 'ico'))).resize({ width: 16, height: 16 }),
                click: () => {
                    Settings.show(this.Bridge);
                }
            }, {
                label: 'Traffic',
                icon: '', //NativeImage.createFromPath(Utils.getPath('assets', 'icons', 'traffic.' + (Utils.getOS() === System.MAC ? 'svg' : 'ico'))).resize({ width: 16, height: 16 }),
                click: () => {
                    Traffic.show(this.Bridge);
                }
            }, {
                label: 'Quit',
                role: 'quit'
            }
        ]);

        this.Tray.setContextMenu(this.Menu);

        this.Tray.on('click',  () => {
            this.toggle();
        });

        this.Bridge.getConfiguration().on('FEATURE_CHANGE', (feature, value) => {
            this.send('QR_HIDE', !value);
        });

        this.Bridge.on('LINK_BUTTON_CHANGED', (state) => {
           this.Menu.getMenuItemById('button').enabled = !state;
        });

        IPC.on('bridge', (event, packet) => {
            switch(packet.action) {
                case 'INIT':
                    this.send(Events.BRIDGE_MODEL, this.Bridge.getConfiguration().getModel());
                break;
                case Events.QR_REQUEST:
                    QRCode.toString(`HUE:I:${this.Bridge.getConfiguration().getId()} W:${new Date().getFullYear()}`, {
                        type: 'svg'
                    }, (error, url) => {
                        if(error) {
                            console.error(error);
                            return;
                        }

                        const base64 = Buffer.from(url).toString('base64');
                        this.send(Events.QR_RESPONSE, `data:image/svg+xml;base64,${base64}`);
                    });
                break;
                case Events.LINK_BUTTON:
                    this.Bridge.getLinkButton().activate();
                break;
                case Events.SETTINGS_OPEN:
                    Settings.show(this.Bridge);
                break;
                case 'TRAFFIC_OPEN':
                    Traffic.show(this.Bridge);
                break;
            }
        });

        this.createWindow();
    }

    toggle() {
        if(this.Window.isVisible()) {
            this.Window.hide();
        } else {
            this.showWindow();
        }
    }

    getWindowPosition() {
        const trayBounds        = this.Tray.getBounds();
        const display   = Screen.getDisplayNearestPoint({
            x: trayBounds.x,
            y: trayBounds.y
        });

        const { workArea }    = display;
        const x                 = Math.round(trayBounds.x + (trayBounds.width / 2) - (this.Size.width / 2));
        let y;

        if(Process.platform === 'darwin') {
            y = trayBounds.y + trayBounds.height;
        } else {
            y = workArea.y + workArea.height - Math.round(this.Size.height / 2) - 30;
        }

        return { x, y };
    }

    showWindow() {
        const position = this.getWindowPosition();

        this.Window.setPosition(position.x, position.y, false);
        this.Window.show();
        this.Window.focus();
        this.send('SHOW');
    }

    createWindow() {
        if(!this.Window) {
            this.Window = new BrowserWindow({
                width:          this.Size.width,
                height:         this.Size.height,
                show:           false,
                frame:          false,
                fullscreenable: false,
                resizable:      false,
                transparent:    true,
                skipTaskbar:    true,
                alwaysOnTop:    true,
                webPreferences: {
                    preload:            Utils.getPath('src', 'ui', 'Preload.js'),
                    contextIsolation:   true,
                    nodeIntegration:    false
                }
            });

            this.Window.loadURL(`file://${Utils.getPath('assets', 'window', 'Tray.html')}`);

            this.Window.on('blur', () => {
                if(!this.Window.webContents.isDevToolsOpened()) {
                    this.Window.hide();
                }
            });

            this.Bridge.on('MODEL_CHANGE', () => {
                this.send(Events.BRIDGE_MODEL, this.Bridge.getConfiguration().getModel());
            });

            this.Bridge.on('INITIAL_CONFIG_REQUESTED', () => {
                this.send(Events.LINK_BUTTON_REQUESTED);
            });

            this.Bridge.on('LINK_BUTTON_CHANGED', (state) => {
                console.log('LINK_BUTTON_CHANGED', state);
            });
        }
    }

    send(name, data) {
        if(!this.Window) {
            return;
        }

        this.Window.webContents.send('bridge', {
            action: name,
            data:   data
        });
    }
}()