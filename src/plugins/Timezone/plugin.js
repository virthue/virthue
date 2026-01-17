import FileSystem from 'node:fs';
import Utils from '../../Utils.js';

export default class Timezone extends Plugin {
    Timezones = [];

    constructor() {
        super('/info/timezones', [ 'GET' ]);

        // @ToDo Check if file exists, JSON parsing
        this.Timezones = FileSystem.readFileSync(Utils.getPath('src', 'plugins', 'TimeZone', 'timezones.json'));
    }
}