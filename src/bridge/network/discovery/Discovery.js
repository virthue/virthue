/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import bonjour from 'bonjour';

export default class Discovery {
    Bridge  = null;
    Service = null;

    constructor(bridge) {
        this.Bridge = bridge;

        this.#init();
    }

    #init() {
        this.Service = bonjour().publish({
            name:   this.getServiceName(),
            type:   'hue',
            port:   this.getServicePort(),
            txt:    this.getServiceData()
        });
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

        return `Hue Bridge - ${this.Bridge.getConfiguration().getId(true)}`;
    }

    getServicePort() {
        return this.Bridge.getConfiguration().getPort();
    }

    getServiceData() {
        return {
            modelid:    this.Bridge.getConfiguration().getModel(),
            bridgeid:   this.Bridge.getConfiguration().getId()
        };
    }
}