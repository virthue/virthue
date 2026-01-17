import * as Events from 'node:events';
import Discovery from './network/discovery/Discovery.js';
import WebServer from './network/server/WebServer.js';
import ResourceType from './resource/ResourceType.js';
import Resources from './resource/Resources.js';
import LinkButton from './LinkButton.js';
import Authentication from "./Authentication.js";
import FileSystem from "node:fs";
import Utils from "../Utils.js";
import Configuration from "./Configuration.js";
import Support from "./Support.js";

export default class Bridge extends Events.EventEmitter {
    HTTP                    = null;
    HTTPS                   = null;
    Discovery               = null;
    Resources               = null;
    Configuration    = new Configuration();
    LinkButton         = new LinkButton(this);
    Authentication  = new Authentication(this);

    constructor() {
        super();

        this.Configuration  = new Configuration();
        this.Resources      = new Resources();

        // Loading Resources
        let bridge = this.Resources.add(ResourceType.BRIDGE, {
            bridge_id: this.Configuration.getId(),
            time_zone: {
                time_zone: 'Europe/Berlin'
            }
        });

        let bridgeDevice = this.Resources.add(ResourceType.DEVICE, {
            product_data: {
                model_id:           this.Configuration.getModel(),
                manufacturer_name:  'Signify Netherlands B.V.',
                product_name:       'Hue Bridge',
                product_archetype:  'bridge_v2',
                certified:          this.Configuration.supports(Support.CERTIFIED),
                software_version:   this.Configuration.getVersionBundle()
            },
            metadata: {
                name:       'Hue Bridge',
                archetype:  'bridge_v2'
            },
            identify: {},
            services: [
                bridge.getReference()
            ]
        });

        bridge.addOwner(bridgeDevice);

        this.Resources.add(ResourceType.CLIP, {
            resources: Object.values(ResourceType)
        });

        this.Resources.add(ResourceType.MATTER, {
            has_qr_code:                this.Configuration.supports(Support.QR),
            max_fabrics:                16,
            software_version_string:    '1.3.0'
        });

        // Init
        this.#init().then(() => {
            console.log('BRIDGE_READY');
            this.emit('BRIDGE_READY');
        });
    }

    async #init() {
        this.HTTP   = new WebServer(this.Configuration.getIPAddress(), this.Configuration.getPort());
        await this.bindREST(this.HTTP);

        if(this.Configuration.supports(Support.SECURED)) {
            this.HTTPS = new WebServer(this.Configuration.getIPAddress(), this.Configuration.getSecuredPort(), true);
            await this.bindREST(this.HTTPS);
        }


        this.Discovery = new Discovery(this);

        setTimeout(() => {
            this.emit('MODEL_CHANGE');
        }, 1000);
    }

    getConfiguration() {
        return this.Configuration;
    }

    getAuthentication() {
        return this.Authentication;
    }

    getLinkButton() {
        return this.LinkButton;
    }

    async bindREST(server) {
        /* Authentication */
        server.add().post('/api', async (request, reply) => await this.Authentication.onRequest(request, reply));


        /* @ToDo Move to TimeZone Plugin */
        server.add().get('/api/:token/info/timezones', {
            preHandler: async (request, reply) => await this.Authentication.checkAuth(request, reply)
        }, async (request, reply) => {
            return FileSystem.readFileSync(Utils.getPath('src', 'plugins', 'TimeZone', 'timezones.json'));
        });

        /* Bridge Infos without Auth */
        server.add().get('/api/config', async () => {
            this.emit('INITIAL_CONFIG_REQUESTED');

            return {
                name:               this.Configuration.getName(),
                apiversion:         this.Configuration.getAPIVersion(),
                swversion:          `${this.Configuration.getVersion()}`,
                mac:                this.Configuration.getMACAddress(),
                bridgeid:           this.Configuration.getId(),
                modelid:            this.Configuration.getModel(),
                datastoreversion:   '180',
                factorynew:         false,
                replacesbridgeid:   null,
                starterkitid:       ''
            };
        });

        /* Bridge Infos without Auth */
        if(this.Configuration.supports(Support.DESCRIPTION)) {
            server.add().get('/Description.xml', async () => {
                return `<?xml version="1.0" encoding="UTF-8" ?>
                        <root xmlns="urn:schemas-upnp-org:device-1-0">
                            <specVersion>
                                <major>1</major>
                                <minor>0</minor>
                            </specVersion>
                            <URLBase>http://${this.Configuration.getIPAddress()}:${this.Configuration.getPort()}/</URLBase>
                            <device>
                                <deviceType>urn:schemas-upnp-org:device:Basic:1</deviceType>
                                <friendlyName>${this.Configuration.getName()} (${this.Configuration.getIPAddress()})</friendlyName>
                                <manufacturer>Signify</manufacturer>
                                <manufacturerURL>http://www.philips-hue.com</manufacturerURL>
                                <modelDescription>Philips hue Personal Wireless Lighting</modelDescription>
                                <modelName>Philips hue bridge 2015</modelName>
                                <modelNumber>${this.Configuration.getModel()}</modelNumber>
                                <modelURL>http://www.philips-hue.com</modelURL>
                                <serialNumber>${this.Configuration.getId()}</serialNumber>
                                <UDN>uuid:2f402f80-da50-11e1-9b23-${this.Configuration.getId()}</UDN>
                                <presentationURL>index.html</presentationURL>
                            </device>
                        </root>`;
            });
        }

        /* Detailed bridge config */
        server.add().get('/api/:token/:config?', {
            preHandler: async (request, reply) => await this.Authentication.checkAuth(request, reply)
        }, async (request, reply) => {
            // @ToDo Plugins hook into these to add some entries,..
            return {
                name:                   this.Configuration.getName(),
                zigbeechannel:          25,
                bridgeid:               this.Configuration.getId(),
                mac:                    this.Configuration.getMACAddress(),
                dhcp:                   true,
                ipaddress:              this.Configuration.getIPAddress(),
                netmask:                '255.255.255.0',
                gateway:                '192.168.0.1',
                proxyaddress:           'none',
                proxyport:              0,
                UTC:                    '2026-01-13T18:14:11',
                localtime:              '2026-01-13T19:14:11',
                timezone:               'Europe/Berlin',
                modelid:                this.Configuration.getModel(),
                datastoreversion:       '180',
                swversion:              `${this.Configuration.getVersion()}`,
                apiversion:             this.Configuration.getAPIVersion(),
                swupdate2: {
                    checkforupdate:     false,
                    lastchange:         '2026-01-08T13:55:02',
                    bridge: {
                        state:          'noupdates',
                        lastinstall:    '2026-01-08T13:55:02'
                    },
                    state:              'noupdates',
                    autoinstall: {
                        updatetime:     'T14:00:00',
                        on:             true
                    }
                },
                linkbutton:             this.LinkButton.getState(),
                portalservices:         false,
                analyticsconsent:       false,
                portalconnection:       'disconnected',
                portalstate: {
                    signedon:           false,
                    incoming:           false,
                    outgoing:           false,
                    communication:      'disconnected'
                },
                internetservices: {
                    internet:           'connected',
                    remoteaccess:       'connected',
                    time:               'connected',
                    swupdate:           'connected'
                },
                factorynew:             false,
                replacesbridgeid:       null,
                starterkitid:           '',
                backup: {
                    status:             'idle',
                    errorcode:          0
                },
                whitelist: this.Authentication.toJSON()
            };
        });

        server.add().get('/api/:token/capabilities', async (request, reply) => {
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
                timezones: {
                    available: 1,
                    values: [
                        'Europe/Berlin'
                    ]
                }
            };
        });

        // @ToDO V2 API
        server.add().get('/eventstream/clip/v2/', async (request, reply) => {
            return {};
        });

        server.add().get('/clip/v2/resource', async (request, reply) => {
            /*
            * Headers: {
              'hue-application-key': 'HereIsTheAPIToken',
                            connection: 'Keep-Alive',
                 */

            return {
                errors: [],
                data: this.Resources
            };
        });
    }
}