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