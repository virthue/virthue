import Events from '../../src/ui/Events.js';
import Support from "../../src/bridge/Support.js";

export default class Settings {
    constructor() {
        window.IPC.on('settings', (packet) => {
            switch(packet.action) {
                case 'SETTINGS':
                    this.update('id', packet.data?.id);
                    this.update('name', packet.data?.name);
                    this.update('model', packet.data?.model);

                    if(packet.data?.network) {
                        let network = packet.data?.network;

                        this.update('address', network?.address);
                        this.update('mac', network?.mac);
                        this.update('port', network?.port);
                        this.update('tls', network?.tls);

                        this.enable('address', !network?.autoresolve);
                    }

                    for(const support in Support) {
                        let value = Support[support];

                        this.check(value, packet.data?.supports?.includes(value));
                    }
                break;
                case 'ACCOUNTS':
                    if(!packet?.data) {
                        return;
                    }

                    let count       = 0;
                    let accounts    = document.querySelector('ui-list[data-id="accounts"]');
                    let counter     = accounts.querySelector('ui-header aside');
                    let data        = accounts.querySelector('ui-data');
                    data.innerHTML          = '';

                    for(const token in packet.data) {
                        let account                 = packet.data[token];
                        const entry	= document.createElement('ui-entry');
                        this.setGrid(data, entry);
                        this.addEntry(entry, account.name);
                        this.addEntry(entry, token);
                        this.addEntry(entry, account['create date']);
                        this.addEntry(entry, account['last use date']);
                        data.append(entry);
                        counter.innerHTML = `${++count} Entries`;
                    }
                break;
                case 'VIRTHUE':
                    if(!packet?.data) {
                        return;
                    }

                    this.content('version', packet.data.version);
                    this.content('electron', packet.data.electron);
                    this.content('node', packet.data.node);
                break;
            }
        });

        document.querySelector('input[name="secured"]').addEventListener('change', (event) => {
            document.querySelector('input[name="tls"]').disabled = !event.currentTarget.checked;
        });

        this.send('INIT');
    }

    generateID(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id      = '';

        for(let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);

            id += chars[randomIndex];
        }

        return id;
    }

    generateMacAddress(separator = ':') {
        const hexChars  = '0123456789ABCDEF';
        const octets    = [];

        for(let i = 0; i < 6; i++) {
            let octet = '';

            for(let j = 0; j < 2; j++) {
                const randomIndex = Math.floor(Math.random() * hexChars.length);
                octet += hexChars[randomIndex];
            }

            octets.push(octet);
        }

        return octets.join(separator);
    }

    onAction(action, value, event) {
        switch(action) {
            case 'random':
                switch(value) {
                    case 'id':
                        this.update(value, this.generateID(16));
                    break;
                    case 'mac':
                        this.update(value, this.generateMacAddress());
                    break;
                }
            break;
            case 'save':
                let actionBar = event.target.closest('section[data-name]');

                if(actionBar) {
                    let target= actionBar.dataset.name;
                    let form = document.querySelector(`section[data-name="${target}"] form`);

                    if(form) {
                        let result      = {};
                        let data  = new FormData(form);

                        for(let key of data.keys()) {
                            result[key] = data.get(key);
                        }

                        // @ToDo validator?

                        this.send('SETTINGS_SAVE', { target, ...result });
                    }
                }
            break;
            case 'URL_PHILIPS':
            case 'URL_PHILIPS_LIGTHNING':
            case 'URL_PHILIPS_HUE':
            case 'URL_SIGNIFY':
            case 'GITHUB_ISSUE':
            case 'GITHUB_REPOSITORY':
                this.send('URL_OPEN', action);
            break;
            default:
                console.log('Action not found:', action, value, event.currentTarget);
            break;
        }
    }

    send(name, data) {
        if(typeof(data) === 'string') {
            data = {
                data: data
            };
        }

        window.IPC.send('settings',  {
            action: name,
            data
        });
    }

    update(name, value) {
        let element = document.querySelector(`[name="${name}"]`);

        if(!element) {
            console.warn('Element not found:', name);
            return;
        }

        element.value = value;
    }

    content(name, value) {
        let element = document.querySelector(`[data-name="${name}"]`);

        if(!element) {
            console.warn('Element not found:', name);
            return;
        }

        element.innerHTML = value;
    }

    enable(name, state) {
        let element = document.querySelector(`[name="${name}"]`);

        if(!element) {
            console.warn('Element not found:', name);
            return;
        }

        element.disabled = !state;
    }

    check(name, state) {
        let element = document.querySelector(`[type="checkbox"][name="${name}"]`);

        if(!element) {
            console.warn('Element not found:', name);
            return;
        }

        element.checked = state;

        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    addEntry(container, content, additional) {
        const element = document.createElement('div');

        if(content instanceof HTMLElement) {
            element.append(content);
        } else {
            element.innerHTML = content;
        }

        if(additional) {
            element.append(additional);
        }

        container.append(element);
    }

    setGrid(container, element) {
        element.style.gridTemplateColumns	= container.parentNode.querySelector('ui-header').style.gridTemplateColumns;
    }
}