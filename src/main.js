import Bridge from './bridge/Bridge.js';
import Tray from './ui/Tray.js';
import Settings from "./ui/Settings.js";

(new class Main {
    Bridge = null;

    constructor() {
        // Loading Config

        // Init Bridge
        this.Bridge = new Bridge();

        // Init UI
        Tray.start(this.Bridge);
        Settings.start(this.Bridge);
    }
}());