/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import MDNS from 'mdns-js';
import Logger from '../../../utils/Logger.js';

export default class Discovery {
    Bridge       = null;
    Advertisement = null;

    constructor(bridge) {
        this.Bridge = bridge;

        Logger.info('Discovery', 'Initialized');

        try {
            const serviceName                = this.getServiceName();
            const servicePort                       = this.getServicePort();
            const serviceTxt   = this.getServiceData();

            Logger.info('Discovery', `Service Name: ${serviceName}`);
            Logger.info('Discovery', `Service Port: ${servicePort}`);
            Logger.info('Discovery', `Service TXT: ${JSON.stringify(serviceTxt)}`);

            this.Advertisement = MDNS.createAdvertisement(MDNS.tcp('_hue'), servicePort, {
                name:   serviceName,
                txt:    serviceTxt
            });

            Logger.info('Discovery', 'Advertisement created, calling start()');
            this.Advertisement.start();
            Logger.info('Discovery', `Publishing service: ${serviceName} on port ${servicePort}`);
        } catch (error) {
            Logger.error('Discovery', 'Failed to create advertisement:', error.message);
        }
    }

    destroy() {
        if(this.Advertisement) {
            this.Advertisement.stop();
        }
    }

    getServiceName() {
        /*
        * IMPORTANT:
        * Do not change the name of the service!
        * Some apps check this name to verify that it is a Hue device (I know it's stupid):
        *
        * Hue Essentials (App):
        *   if (nsdServiceInfo.getServiceType().equals("_hue._tcp.") && (C1688a.m6022a(nsdServiceInfo.getServiceName(), "Philips Hue - ", false) || C1688a.m6022a(nsdServiceInfo.getServiceName(), "Hue Bridge - ", false))) {
        */

        return `Hue Bridge - ${this.Bridge.getId(true)}`;
    }

    getServicePort() {
        return this.Bridge.getConfiguration().getPort();
    }

    getServiceData() {
        return {
            modelid:    this.Bridge.getConfiguration().getModel(),
            bridgeid:   this.Bridge.getId()
        };
    }
}