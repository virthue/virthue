import URL from 'node:url';
import Path from 'node:path';

export default (new class Utils {
    Path = null;

    constructor() {
        const __filename = URL.fileURLToPath(import.meta.url);
        const __dirname  = Path.dirname(__filename);
        this.Path              =  Path.join(__dirname);
    }

    getPath(...path) {
        return Path.join(this.Path, '..',  ...path);
    }
});