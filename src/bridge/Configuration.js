/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import FileSystem from 'node:fs';
import Events from 'node:events';
import Interfaces, { Family }  from './network/Interfaces.js';
import Utils from '../Utils.js';

export default class Configuration extends Events.EventEmitter {
    Name    = null;
    Model   = null;
    Network = {
        MAC:                null,
        Address:            null,
        ResolvedAddress:    null,
        Port:               null,
        TLS:                null
    };

    Version = {
        API:    null,
        Number: null
    }

    SupportFlags = [];

    constructor() {
        super();

        let Config;

        try {
            Config =  JSON.parse(FileSystem.readFileSync(Utils.getPath('bridge.config.json')));

            this.Name                       = Config.bridge.name;
            this.Model                      = Config.bridge.model;
            this.Network.MAC                = Config.network.mac;
            this.Network.Address            = Config.network.address;
            this.Network.ResolvedAddress    = Interfaces.getAddress(Family.IPv4);
            this.Network.Port               = Number(Config.network.port);
            this.Network.TLS                = Number(Config.network.tls);

            this.Version.API                = Config.bridge.version.api;
            this.Version.Number             = Config.bridge.version.number;

            this.SupportFlags               = Config.bridge.supports ?? [];
        } catch(error) {
            // @ToDo Error Dialog?
        }
    }

    store() {
        try {
            FileSystem.writeFileSync(Utils.getPath('bridge.config.json'), JSON.stringify({
                bridge: {
                    name:   this.Name,
                    model:  this.Model,
                    version: {
                        number: Number(this.Version.Number),
                        api:    this.Version.API
                    },
                    supports: this.SupportFlags
                },
                network: {
                    mac:        this.Network.MAC,
                    address:    this.Network.Address,
                    port:       Number(this.Network.Port),
                    tls:        Number(this.Network.TLS)
                }
            }, null, 4));
        } catch (error) {
            /* Do Nothing */
        }
    }

    supports(flag) {
        return this.SupportFlags.includes(flag);
    }

    getSupportFlags() {
        return this.SupportFlags;
    }

    addSupportFlag(flag) {
        if(this.SupportFlags.includes(flag)) {
            return;
        }

        this.SupportFlags.push(flag);
        this.emit('FEATURE_CHANGE', flag, true);
    }

    removeSupportFlag(flag) {
        this.SupportFlags = this.SupportFlags.filter(f => f !== flag);

        this.emit('FEATURE_CHANGE', flag, false);
    }

    getName() {
        return this.Name;
    }

    getModel() {
        return this.Model;
    }

    setModel(model) {
        this.Model = model;
    }

    setName(name) {
        this.Name = name;
    }

    getMACAddress() {
        return this.Network.MAC;
    }

    setMACAddress(mac) {
        this.Network.MAC = mac;
    }

    automaticResolveIPAddress() {
        return (this.Network.Address === 'auto');
    }

    getIPAddress() {
        if(this.automaticResolveIPAddress()) {
            return this.Network.ResolvedAddress ?? '127.0.0.1';
        }

        return this.Network.Address;
    }

    setIPAddress(ip) {
        this.Network.Address = ip;
    }

    getPort() {
        return this.Network.Port;
    }

    setPort(port) {
        this.Network.Port = Number(port);
    }

    getSecuredPort() {
        return this.Network.TLS;
    }

    setSecuredPort(port) {
        this.Network.TLS = Number(port);
    }

    getAPIVersion() {
        return this.Version.API;
    }

    setAPIVersion(version) {
        this.Version.API = version;
    }

    getVersion() {
        return this.Version.Number;
    }

    setVersion(version) {
        this.Version.Number = version;
    }

    getVersionBundle() {
        return `${parseFloat(this.Version.API, 2)}.${this.Version.Number}`;
    }

    toJSON() {
        return {
            name:   this.Name,
            model:  this.Model,
            network: {
                mac:            this.Network.MAC,
                address:        this.getIPAddress(),
                autoresolve:    this.automaticResolveIPAddress(),
                port:           Number(this.Network.Port),
                tls:            Number(this.Network.TLS)
            },
            supports: this.SupportFlags
        }
    }
}