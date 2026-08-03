/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import Plugin from '../../bridge/Plugin.js';
import Support from "../../types/Support.js";

export default class Description extends Plugin {
    Name        = 'Description';
    Description = 'Provides the old Description.xml from the device';
    Version     = '1.0.0';


    /* GET /Description.xml */
    getCustom(request, response) {
        const bridge = this.getBridge();
        const config = bridge.getConfiguration();

        if(!config.supports(Support.DESCRIPTION)) {
            // ToDo call it to the htdocs directroy!
            return response.code(404).send('<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">\n' +
                '<html>\n' +
                '<head>\n' +
                '    <title>hue personal wireless lighting</title>\n' +
                '    <link rel="stylesheet" type="text/css" href="/index.css">\n' +
                '</head>\n' +
                '<body>\n' +
                '    <div class="header">\n' +
                '      <h1>hue personal wireless lighting</h1>\n' +
                '      <img src="/hue-color-line.png" class="colorline" />\n' +
                '    </div>\n' +
                '    <div class="error">Oops, there appears to be no lighting here</div>\n' +
                '</body>\n' +
                '</html>\n');
        }

        return `<?xml version="1.0" encoding="UTF-8" ?>
                <root xmlns="urn:schemas-upnp-org:device-1-0">
                    <specVersion>
                        <major>1</major>
                        <minor>0</minor>
                    </specVersion>
                    <URLBase>http://${config.getIPAddress()}:${config.getPort()}/</URLBase>
                    <device>
                        <deviceType>urn:schemas-upnp-org:device:Basic:1</deviceType>
                        <friendlyName>${config.getName()} (${config.getIPAddress()})</friendlyName>
                        <manufacturer>Signify</manufacturer>
                        <manufacturerURL>http://www.philips-hue.com</manufacturerURL>
                        <modelDescription>Philips hue Personal Wireless Lighting</modelDescription>
                        <modelName>Philips hue bridge 2015</modelName>
                        <modelNumber>${config.getModel()}</modelNumber>
                        <modelURL>http://www.philips-hue.com</modelURL>
                        <serialNumber>${bridge.getId()}</serialNumber>
                        <UDN>uuid:2f402f80-da50-11e1-9b23-${bridge.getId()}</UDN>
                        <presentationURL>index.html</presentationURL>
                    </device>
                </root>`;
    }
}