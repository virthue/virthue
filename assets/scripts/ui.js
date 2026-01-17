import Events from "../../src/types/Events.js";

window.UI = (new class UI {
    Modules = {};

    constructor() {
        if(document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.#boot);
        } else {
            this.#boot();
        }

        this.send('INIT');
    }

    #boot() {
       let boot     = document.querySelector('[type="module"][src$="scripts/ui.js"]');
       let modules    = boot?.dataset?.modules?.split(',') ?? [];

       for(let module of modules) {
           this.#loadModule(module);
       }

        document.addEventListener('click', (event) => {
            let data = event.target.closest('[data-action]');

            if(data) {
                let action = data.dataset.action;
                let value   = null;

                if(action.indexOf(':') !== -1) {
                    [action, value] = action.split(':', 2);
                }

                for(const module in this.Modules) {
                    const instance = this.Modules[module];

                    if(instance.onAction) {
                        instance.onAction(action, value, event);
                    }
                }
            }
        });
    }

    async #loadModule(module) {
        const imported       = await import(`./${module.toLowerCase()}.js`);
        this.Modules[module] = new imported.default();
    }

    getModule(name) {
        return this.Modules[name];
    }
});