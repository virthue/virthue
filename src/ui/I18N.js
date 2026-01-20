import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import Utils from '../Utils.js';

export default (new class I18N {
    Language       = 'en_US';
    Path            = null;
    Cache             = {};

    constructor() {
        this.Path = Utils.getPath('assets', 'languages');
    }

    // simple translation
    __(string) {
        if(typeof(this.Cache[this.Language]) === 'undefined') {
            return string;
        }

        if(typeof(this.Cache[this.Language][string]) !== 'undefined') {
            string = this.Cache[this.Language][string];
        }

        return string;
    }

    // Singular / Plural detection
    __sp(singular, plural, count) {
        if(count === 1) {
            return this.format(this.__(singular), count);
        }

        return this.format(this.__(plural), count);
    }

    async init() {
        for(const entry of await FileSystem.readdir(this.Path , {
            withFileTypes: true
        })) {
            if(!entry.isDirectory()) {
                try {
                    const file   = entry.name;
                    const name   = Path.basename(file, Path.extname(file));
                    this.Cache[name]    = JSON.parse(
                        await FileSystem.readFile(Path.join(entry.parentPath, file), 'utf-8')
                    );
                } catch (error) {
                    console.error(`Failed to load language ${entry.name}:`, error);
                }
            }
        }
    }

    format(string, ...args) {
        let index = 0;

        return string.replace(/%([sdifoxXb])/g, (match, type) => {
            const arg = args[index++];

            switch(type) {
                case 's': return String(arg);                    // String
                case 'd':
                case 'i': return parseInt(arg);                  // Integer
                case 'f': return parseFloat(arg);                // Float
                case 'o': return arg.toString(8);                // Octal
                case 'x': return arg.toString(16);               // Hex (lowercase)
                case 'X': return arg.toString(16).toUpperCase(); // Hex (uppercase)
                case 'b': return arg.toString(2);                // Binary
                default:  return arg;
            }
        });
    }

    reloadI18N() {
        document.querySelectorAll('[i18n-text]').forEach((element) => {
            element.innerText = this.__(element.getAttribute('i18n-text'));
        });
    }
}());