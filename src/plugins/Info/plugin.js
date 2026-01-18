import Plugin from '../../bridge/Plugin.js';

/*
* @docs https://developers.meethue.com/develop/hue-api/8-info-api-deprecated-as-of-1-15/
*/
export default class Info extends Plugin {
    Name        = 'Info';
    Description = 'Provides Informations from the device';
    Version     = '1.0.0';

    /* GET /api/:token/info/timezones */
    /*
    * @Deprecated as of v1.15.0. use /api/<username>/capabilities/timezones
    */
    getResource(request) {
        const bridge = this.getBridge();

        if(request.params?.id === 'timezones') {
            return bridge.getPlugin('Timezone').getCustom();
        }
    }
}
