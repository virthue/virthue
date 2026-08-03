window.UI = (new class UI {
    Modules = {};

    constructor() {
        if(document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.#boot.bind(this));
        } else {
            this.#boot();
        }
    }

    #boot() {
       let boot     = document.querySelector('[type="module"][src$="scripts/ui.js"]');
       let modules    = boot?.dataset?.modules?.split(',') ?? [];

       for(let module of modules) {
           this.#loadModule(module);
       }

       // ToDo Inject language

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
        return import(`./${module.toLowerCase()}.js`).then((imported) => {
            try {
                this.Modules[module] = new imported.default();
            } catch(error) {
                console.error(error);
            }
        }).catch(error => {
            console.error(error);
        });
    }

    getModule(name) {
        return this.Modules[name];
    }
});