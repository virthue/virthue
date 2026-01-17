/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import Resource from './Resource.js';

export default class Resources {
    Items = [];

    add(type, data) {
        let resource = new Resource(type, data);

        this.Items.push(resource);

        return resource;
    }

    get(id) {
        return this.Items.filter((resource) => resource.ID === id);
    }

    all() {
        return this.Items;
    }

    size(id) {
        return this.Items.length;
    }

    toJSON() {
        return this.Items.map(resource => resource.toJSON());
    }
}