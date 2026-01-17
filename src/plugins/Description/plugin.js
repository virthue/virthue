import Utils from '../../Utils.js';

export default class Description extends Plugin {
    Timezones = [];

    constructor() {
        super('/Description.xml', [ 'GET' ]);
    }
}