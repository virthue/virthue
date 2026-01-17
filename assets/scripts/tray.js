import Events from '../../src/ui/Events.js';

export default class Tray {
    Device = null;

    constructor() {
        this.Device = document.querySelector('object');

        window.IPC.on('bridge', (packet) => {
            switch(packet.action) {
                case Events.QR_RESPONSE:
                    this.showQRCode(packet.data);
                break;
                case Events.BRIDGE_MODEL:
                    this.changeModel(packet.data);
                break;
                case 'LINK_BUTTON_REQUESTED':
                    this.showQRCode(null);
                break;
            }
        });
    }

    onAction(action, value) {
        switch(action) {
            case 'qr':
                let main = document.querySelector('main');

                if(main.dataset.qr === 'true') {
                    main.dataset.qr = 'false';
                } else {
                    this.send(Events.QR_REQUEST);
                }
            break;
            case 'settings':
                this.send(Events.SETTINGS_OPEN);
            break;
            default:
                console.log('Action not found:', action, value);
            break;
        }
    }

    showQRCode(image) {
        let main = document.querySelector('main');
        let code      = main.querySelector('ui-qr picture');

        if(image === null) {
            main.dataset.qr = 'false';
            return;
        }

        code.style.backgroundImage = `url(${image})`;
        main.dataset.qr = 'true';
    }

    changeModel(type) {
        this.Device.addEventListener('load', () => {
            let content    = this.Device.contentDocument;
            let button      = content.querySelector('#button');

            /* Bind Link-Button */
            button.addEventListener('click', () => {
                this.send(Events.LINK_BUTTON);
            });
        });

        this.Device.setAttribute('data', `../devices/${type}.svg`);
    }

    send(name, data) {
        if(typeof(data) === 'string') {
            data = {
                data: data
            };
        }
        window.IPC.send('bridge',  {
            action: name,
            ...data
        });
    }
}