import Config from '../../bridge.config.json' with { type: 'json' };
import Support from "./Support.js";
import Interfaces from "./network/Interfaces.js";

export default class Configuration {
    ID      = null;
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
        API: null,
        Number: null
    }

    // @ToDo make it configurble
    SupportFlags = [
        Support.DESCRIPTION,
        Support.QR,
        Support.CERTIFIED,
       // Support.SECURED
    ];

    constructor() {
        this.ID                         = Config.bridge.id;
        this.Name                       = Config.bridge.name;
        this.Model                      = Config.bridge.model;
        this.Network.MAC                = Config.network.mac;
        this.Network.Address            = Config.network.address;
        this.Network.ResolvedAddress    = Interfaces.getAddress();
        this.Network.Port               = Config.network.port;
        this.Network.TLS                = Config.network.tls;

        this.Version.API                = Config.bridge.version.api;
        this.Version.Number             = Config.bridge.version.number;

    }

    supports(flag) {
        return this.SupportFlags.includes(flag);
    }

    addSupportFlag(flag) {
        this.SupportFlags.push(flag);
    }

    removeSupportFlag(flag) {
        this.SupportFlags = this.SupportFlags.filter(f => f !== flag);
    }

    getId() {
        return this.ID;
    }

    setId(id) {
        this.ID = id;
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
        return this.Network.Address === 'auto';
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
        this.Network.Port = port;
    }

    getSecuredPort() {
        return this.Network.TLS;
    }

    setSecuredPort(port) {
        this.Network.TLS = port;
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
            id:     this.ID,
            name:   this.Name,
            model:  this.Model,
            network: {
                mac:            this.Network.MAC,
                address:        this.getIPAddress(),
                autoresolve:    this.automaticResolveIPAddress(),
                port:           this.Network.Port,
                tls:            this.Network.TLS
            },
            supports: this.SupportFlags
        }
    }
}