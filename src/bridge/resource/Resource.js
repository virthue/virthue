import Crypto from 'node:crypto';

export default class Resource {
    ID      = null;
    Type    = null;
    Data    = null;
    Owner   = null;

    constructor(type, data = null) {
        this.ID     = Crypto.randomUUID();
        this.Type   = type;
        this.Data   = data;
    }

    addOwner(resource)  {
        this.Owner = resource;
    }

    getReference() {
        return {
            rid:    this.ID,
            rtype:  this.Type
        };
    }

    toJSON() {
        return {
            id:     this.ID,
            type:   this.Type,
            owner:  this.Owner?.getReference(),
            ...this.Data
        }
    }
}
