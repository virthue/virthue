/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import 'reflect-metadata';
import Path from 'node:path';
import FileSystem from 'node:fs/promises';
import Bridge from './bridge/Bridge.js';
import Tray from './ui/Tray.js';
import Settings from './ui/Settings.js';
import I18N from './ui/I18N.js';

(new class Main {
    Bridge          = null;
    Directories   = ['.data', '.certs'];

    constructor() {
        // @ToDo add here an CLI interpreter for some CLI options

        // Initialize application directories
        this.#preload();

        // Init Bridge
        this.Bridge = new Bridge();

        I18N.init().then(() => {
            // Init UI
            Tray.start(this.Bridge);
            Settings.start(this.Bridge);
        });
    }

    async #preload() {
        for(const dir of this.Directories) {
            const dirPath = Path.join(process.cwd(), dir);

            try {
                await FileSystem.mkdir(dirPath, { recursive: true });
                console.log(`[Init] Directory ensured: ${dir}/`);
            } catch (error) {
                console.error(`[Init] Failed to create directory ${dir}:`, error.message);
                throw error;
            }
        }
    }
}());