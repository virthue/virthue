import * as Events from 'node:events';
import FileSystem from 'node:fs';
import Discovery from './network/discovery/Discovery.js';
import WebServer from './network/server/WebServer.js';
import ResourceType from '../types/ResourceType.js';
import Resources from './resource/Resources.js';
import LinkButton from './LinkButton.js';
import Authentication from "./Authentication.js";
import Configuration from "./Configuration.js";
import Support from "../types/Support.js";
import Plugins from "./Plugins.js";
import Utils from "../Utils.js";

export default class Bridge extends Events.EventEmitter {
    HTTP                    = null;
    HTTPS                   = null;
    Plugins                 = null;
    Discovery               = null;
    Resources               = null;
    Configuration    = new Configuration();
    LinkButton         = new LinkButton(this);
    Authentication  = new Authentication(this);

    constructor() {
        super();

        this.Configuration  = new Configuration();
        this.Resources      = new Resources();
        this.Plugins        = new Plugins(this);

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
        const docRoot = Utils.getPath('htdocs');

        await this.Plugins.loadPlugins();
        console.log(`Loaded ${this.Plugins.getCount()} plugins`);

        this.HTTP   = new WebServer(this.Configuration.getIPAddress(), this.Configuration.getPort(), false, docRoot);
        await this.bindREST(this.HTTP);

        if(this.Configuration.supports(Support.SECURED)) {
            this.HTTPS = new WebServer(this.Configuration.getIPAddress(), this.Configuration.getSecuredPort(), true, docRoot);
            await this.bindREST(this.HTTPS);

            // @docs https://developers.meethue.com/develop/hue-api-v2/migration-guide-to-the-new-hue-api/
            if(this.Configuration.getVersion() >= 1948086000) {
                await this.HTTPS.startSSE('/eventstream/clip/v2', [ 'hue-application-key' ],async (request, reply) => {
                    const appKey = request.headers['hue-application-key'];

                    if (!appKey || !this.Authentication.tokenExists(appKey)) {
                        return reply.code(403).send({
                            error: 'Unauthorized',
                            description: 'Invalid hue-application-key'
                        });
                    }

                    reply.raw.writeHead(200, {
                        'Content-Type':         'text/event-stream',
                        'Cache-Control':        'no-cache, no-store, must-revalidate',
                        'Connection':           'keep-alive',
                        'X-Accel-Buffering':    'no'
                    });

                    reply.raw.write(':hi\n\n');

                    /** TODO: the original brigde dont send heatbeasts/pings!
                     *
                    const heartbeat = setInterval(() => {
                        reply.raw.write(':heartbeat\n\n');
                    }, 30000);*/

                    const sendEvent = (events) => {
                        const id            = Crypto.randomUUID();
                        const data   = JSON.stringify(events);
                        reply.raw.write(`id: ${id}\n`);
                        reply.raw.write(`data: ${data}\n\n`);
                    };

                    // Event handlers on changes?
                    //this.eventEmitter.on('state-change', sendEvent);

                    request.raw.on('close', () => {
                        if(heartbeat) {
                            clearInterval(heartbeat);
                        }

                        //this.eventEmitter.off('state-change', sendEvent);
                        reply.raw.end();
                    });
                });
            }
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

    getPlugin(name) {
        return this.Plugins.getPlugin(name);
    }

    async bindREST(server) {
        const preHandler = async (request, reply) => await this.Authentication.checkAuth(request, reply);

        /* Dynamical V1 Routes (Plugins) */
        this.Plugins.registerV1Routes(server, this.Authentication);

        /* Unauthenticated Routes */
        server.add().post('/api', async (request, reply) => await this.Authentication.onRequest(request, reply));
        server.add().get('/api/config', async (request, response) =>  this.getPlugin('Config').getAll(request, response));
        server.add().get('/Description.xml', async (request, response) =>  this.getPlugin('Description').getCustom(request, response));

        /* Special Routes with Authentication */
        server.add().get('/api/:token', { preHandler }, async (request, response) =>  {
            // @ToDo iterate over all Plugins & check if <Plugin>.exposing = true is & build these dynamically!
            return {
                lights: {},
                groups: {},
                config: this.getPlugin('Config').getAll(request, response),
                schedules: {},
                scenes: {},
                rules: {},
                resourcelinks: {},
            }
        });

        server.add().get('/info/timezone', { preHandler }, async (request, response) =>  this.getPlugin('Timezone').getCustom(request, response));

        /* V2 API */
        server.add().get('/clip/v2/resource', async (request, reply) => {
            const token = request.headers['hue-application-key'];

            if(!token || !this.Authentication.tokenExists(token)) {
                // @ToDo Yep, the HUE-API is INCONSISTENT with data results!
                return reply.code(403).sendFile('404.html');
            }

            return {
                errors: [],
                data:   this.Resources
            };
        });

        server.add().get('/clip/v2/resource/:type/:id', async (request, reply) => {
            const token = request.headers['hue-application-key'];

            if(!token || !this.Authentication.tokenExists(token)) {
                // @ToDo Yep, the HUE-API is INCONSISTENT with data results!
                return reply.code(403).sendFile('404.html');
            }

            return {
                errors: [],
                data:   this.Resources
            };
        });
    }
}