import Plugin from '../../bridge/Plugin.js';

export default class Capabilities extends Plugin {
    Name        = 'Capabilities';
    Description = 'Provides the Capabilities from the device';
    Version     = '1.0.0';

    /* GET /api/:token/capabilities */
    getAll(request) {
        const bridge = this.getBridge();
        const config = bridge.getConfiguration();
        const timezone = bridge.getPlugin('Timezone');

        // @ToDo make it variable over the Plugins-API!
        return {
            lights: {
                available: 0
            },
            groups: {
                available: 0
            },
            scenes: {
                available: 0,
                lightstates: {
                    available: 0
                }
            },
            rules: {
                available: 0
            },
            shedules: {
                available: 0
            },
            resourcelinks: {
                available: 0
            },
            whitelists: {
                available: 1
            },
            sensors: {
                available: 0,
                clip: {
                    available: 0
                },
                zll: {
                    available: 0
                },
                zgp: {
                    available: 0
                }
            },
            ...(timezone ? {
                timezones: {
                    available:  timezone.getSize(),
                    values:     timezone.getValues()
                }
            } : {})
        };
    }
}
