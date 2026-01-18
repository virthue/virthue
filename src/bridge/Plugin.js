/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
export default class Plugin {
    Plugins = null;

    constructor(plugins) {
        this.Plugins = plugins;
    }

    getBridge() {
        return this.Plugins.getBridge();
    }

    getName() {
        return this.Name;
    }

    getDescription() {
        return this.Description;
    }

    getVersion() {
        return this.Version;
    }
}