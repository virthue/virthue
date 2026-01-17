import bonjour from 'bonjour';
import Config from '../../../../bridge.config.json' with { type: 'json' };

export default class Discovery {
    Service = null;

    constructor(bridge) {
        /*
        * Hue Essentials (App):
        * if (nsdServiceInfo.getServiceType().equals("_hue._tcp.") && (C1688a.m6022a(nsdServiceInfo.getServiceName(), "Philips Hue - ", false) || C1688a.m6022a(nsdServiceInfo.getServiceName(), "Hue Bridge - ", false))) {
        */
        this.Service = bonjour().publish({
            name: `Hue Bridge - ${Config.bridge.id.slice(-6)}`, // Don't change! Some apps check for this name, see lines at the top
            type: 'hue',
            port: Config.network.port,
            txt: {
                modelid:    Config.bridge.model,
                bridgeid:   Config.bridge.id
            }
        });
    }
}