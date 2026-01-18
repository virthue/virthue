/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import Interfaces, { Family }  from '../Interfaces.js';
import OperatingSystem from 'node:os';
import MulticastDNS from 'multicast-dns';

export default class Discovery {
    Bridge                           = null;
    Multicast   = MulticastDNS();
    Services                = new Map();
    Service                          = null;

    constructor(bridge) {
        this.Bridge     = bridge;

        this.Multicast.on('query', (query) => {
            query.questions.forEach((question) => {
                this.Services.forEach((service) => {
                    if(this.#shouldRespond(question, service)) {
                        this.Multicast.respond(this.#createResponse(service));
                    }
                });
            });
        });

        this.Service = this.publish({
            name:   this.getServiceName(),
            type:   '_hue',
            port:   this.getServicePort(),
            txt:    this.getServiceData()
        });
    }

    #shouldRespond(question, service) {
        const serviceFQDN = `${service.name}.${service.type}._tcp.local`;

        return (question.name === serviceFQDN || question.name === `${service.type}._tcp.local` || question.type === 'PTR');
    }

    publish(options) {
        const { name, type, port, txt = {} } = options;
        const service                       = {
            name,
            type,
            port,
            txt,
            fqdn: `${name}.${type}._tcp.local`,
            host: this.#getHostname()
        };

        this.Services.set(service.fqdn, service);

        for(let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.Multicast.respond(this.#createResponse(service));
            }, i * 1000);
        }

        return service;
    }

    unpublish(service) {
        if(typeof(service) === 'string') {
            const found = Array.from(this.Services.values()) .find(s => s.name === service);

            if(found) {
                service = found;
            }
        }

        if(service && service.fqdn) {
            this.Multicast.respond(this.#createResponse(service, 0));
            this.Services.delete(service.fqdn);
        }
    }

    #createResponse(service, ttl = 120) {
        const { name, type, port, txt, fqdn, host }    = service;
        const typeFQDN                          = `${type}._tcp.local`;

        return {
            answers: [{
                type: 'PTR',
                name: typeFQDN,
                data: fqdn,
                ttl
            }, {
                type: 'SRV',
                name: fqdn,
                data: {
                    port,
                    target: host,
                    priority: 0,
                    weight: 0
                },
                ttl
            }, {
                type: 'TXT',
                name: fqdn,
                data: this.#encodeTXT(txt),
                ttl
            }],
            additionals: this.#createAddressRecords(host, ttl)
        };
    }

    #createAddressRecords(host, ttl) {
        const records   = [];
        const ipv4  = Interfaces.getAddress(Family.IPv4);
        const ipv6  = Interfaces.getAddress(Family.IPv6);

        if(ipv4) {
            records.push({
                type: 'A',
                name: host,
                data: ipv4,
                ttl
            });
        }

        if(ipv6) {
            records.push({
                type: 'AAAA',
                name: host,
                data: ipv6,
                ttl
            });
        }

        return records;
    }

    #encodeTXT(txt) {
        return Object.entries(txt).map(([key, value]) => {
            return Buffer.from(`${key}=${value}`);
        });
    }

    #getHostname() {
        return `${OperatingSystem.hostname()}.local`;
    }

    destroy() {
        this.Services.forEach((service) => {
            this.unpublish(service);
        });

        this.Multicast.destroy();
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