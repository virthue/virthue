/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import FileSystem from 'node:fs';
import Plugin from '../../bridge/Plugin.js';
import Utils from '../../Utils.js';

export default class Timezone extends Plugin {
    Name        = 'Timezone';
    Description = 'Provides Timezone informations for the device';
    Version     = '1.0.0';
    Timezones   = [];

    constructor(plugins, bridge) {
        super(plugins, bridge);

        try {
            this.Timezones = JSON.parse(
                FileSystem.readFileSync(Utils.getPath('src', 'plugins', 'Timezone', 'timezones.json'), 'utf-8')
            );
        } catch(error) {
            /* Do Nothing */
        }
    }

    /* GET /info/timezone */
    getCustom() {
        return this.getValues();
    }

    getSize() {
        return this.getValues().length;
    }

    getValues() {
        return this.Timezones;
    }
}