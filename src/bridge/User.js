import Crypto from 'node:crypto';

export default class User {
    ID              = null;
    Token           = null;
    ClientKey       = null;
    Name            = null;
    DateLastUsed    = null;
    DateCreated     = null;

    constructor() {
        this.ID             = Crypto.randomUUID();
        this.DateCreated    = new Date();
    }

    generateToken() {
        this.Token = Crypto.randomBytes(40).toString('base64').replace(/[+/=]/g, '-').substring(0, 40);
    }

    hasToken() {
        return (this.Token !== null);
    }

    setToken(token) {
        this.Token = token;
    }

    getToken() {
        return this.Token;
    }

    setName(name) {
        this.Name = name;
    }

    getName() {
        return this.Name;
    }

    generateClientKey() {
        this.ClientKey = Crypto.randomBytes(16).toString('hex').toUpperCase();
    }

    hasClientKey() {
        return (this.ClientKey !== null);
    }

    getClientKey() {
        return this.ClientKey;
    }

    toJSON() {
        // @ToDo Mistake by Philips hue: malformed JSON, but we used here together
        return {
            'last use date':    this.DateLastUsed,
            'create date':      this.DateCreated,
            name:               this.Name
        };
    }
}