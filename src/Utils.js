/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import URL from 'node:url';
import Path from 'node:path';
import OperatingSystem from 'node:os';

export const System = Object.freeze({
    MAC: 'mac',
    WINDOWS: 'windows',
    LINUX: 'linux'
});

export default (new class Utils {
    Path = null;

    constructor() {
        const __filename= URL.fileURLToPath(import.meta.url);
        const __dirname = Path.dirname(__filename);
        this.Path              =  Path.join(__dirname);
    }

    getPath(...path) {
        return Path.join(this.Path, '..',  ...path);
    }

    getOS() {
        switch(OperatingSystem.platform()) {
            case 'win32':
                return System.WINDOWS;
            case 'darwin':
                return System.MAC;
            case 'linux':
                return System.LINUX
        }
    }
});