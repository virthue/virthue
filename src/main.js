/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import Bridge from './bridge/Bridge.js';
import Tray from './ui/Tray.js';
import Settings from './ui/Settings.js';

(new class Main {
    Bridge = null;

    constructor() {
        // @ToDo add here an CLI interpreter for some CLI options

        // Loading Config

        // Init Bridge
        this.Bridge = new Bridge();

        // Init UI
        Tray.start(this.Bridge);
        Settings.start(this.Bridge);
    }
}());