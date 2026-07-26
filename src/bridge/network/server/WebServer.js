/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import FileSystem from 'node:fs/promises';
import Stream from 'node:stream';
import HTTP from 'node:http';
import HTTPS from 'node:https';
import Fastify from 'fastify';
import SSE from 'fastify-sse-v2';
import FormBody from '@fastify/formbody';
import CORS from '@fastify/cors';
import Static from '@fastify/static';
import Utils from '../../../Utils.js';
import Logger from "../../../utils/Logger.js";

export default class WebServer {
    Hostname    = null;
    Port        = null;
    Directory   = null;
    IsSecured= false;
    Fastify     = null;
    certificates= null;

    constructor(hostname, port, secured = false, directory) {
        this.Hostname   = hostname;
        this.Port       = port;
        this.IsSecured  = secured;
        this.Directory  = directory;
    }

    async #loadCertificates(files) {
        try {
            const [key, cert] = await Promise.all([
                FileSystem.readFile(files.key, 'utf8').catch(() => null),
                FileSystem.readFile(files.cert, 'utf8').catch(() => null)
            ]);

            if(!key || !cert) {
                return null;
            }

            return { key, cert };
        } catch (error) {
            Logger.error('Fehler beim Laden der Zertifikate:', error);
            return null;
        }
    }

    async init() {
        let certificates = null;

        if (this.IsSecured) {
            // Try provisioned certificates first
            let certFiles = {
                key:    Utils.getPath('.certs', 'provisioned_private.pem'),
                cert:   Utils.getPath('.certs', 'provisioned_certificate.crt')
            };

            certificates = await this.#loadCertificates(certFiles);

            if(!certificates) {
                certFiles = {
                    key:    Utils.getPath('.certs', 'private.key'),
                    cert:   Utils.getPath('.certs', 'cert.crt')
                };

                certificates = await this.#loadCertificates(certFiles);
            }
        }

        const fastifyConfig = {
            http2:              false,
            keepAliveTimeout:   65000,
            requestTimeout:     0,
            routerOptions: {
                ignoreTrailingSlash:    true,
                caseSensitive:          false
            },
            ajv: {
                customOptions: {
                    strict: false
                }
            },
            logger: false  // Disable Fastify's built-in logger
        };

        fastifyConfig.serverFactory = (handler, options) => {
            if(this.IsSecured && certificates) {
                const tlsOptions = {
                    ...certificates,
                    minVersion:     'TLSv1.2',
                    maxVersion:     'TLSv1.2',
                    sessionTimeout: 86400
                };

                const httpsServer = HTTPS.createServer(tlsOptions, handler);

                httpsServer.keepAliveTimeout    = 65000;
                httpsServer.headersTimeout      = 66000;

                httpsServer.on('connection', (socket) => {
                    socket.setKeepAlive(true, 60000);
                });

                return httpsServer;
            } else {
                const httpServer = HTTP.createServer(handler);

                httpServer.keepAliveTimeout     = 65000;
                httpServer.headersTimeout       = 66000;

                return httpServer;
            }
        };

        this.Fastify        = Fastify(fastifyConfig);
        this.certificates   = certificates;

        if(this.IsSecured && !certificates) {
            Logger.warn('WebServer', 'HTTPS configured but certificates not found');
        }

        return this;
    }

    async start() {
        /* Bind a www-dir */
        if(this.Directory) {
            await this.Fastify.register(Static, {
                root:   this.Directory,
                prefix: '/'
            });
        }

        await this.Fastify.register(FormBody);

        await this.Fastify.register(CORS, {
            origin:     true,
            methods:    [ 'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS' ]
        });

        this.Fastify.addHook('onRequest', async (request, reply) => {
            Logger.debug('WebServer', `${this.IsSecured ? 'HTTPS' : 'HTTP'} ${request.method} ${request.url}`);
        });

        this.Fastify.setErrorHandler((error, request, reply) => {
            Logger.error('WebServer', `${this.IsSecured ? 'HTTPS' : 'HTTP'} ERROR ${request.method} ${request.url}`, error.message);
            reply.code(error.statusCode || 500).send({ error: error.message });
        });

        this.Fastify.addHook('onSend', async (request, reply) => {
            reply.header('x-xss-protection', '1; mode=block');
            reply.header('x-frame-options', 'SAMEORIGIN');
            reply.header('x-content-type-options', 'nosniff');
            reply.header('content-security-policy', "default-src 'self'");
            reply.header('referrer-policy', 'no-referrer');
            reply.header('cache-control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0');
            reply.header('pragma', 'no-cache');
            reply.header('expires', 'Mon, 1 Aug 2011 09:00:00 GMT');
            reply.header('connection', 'keep-alive');
            reply.header('keep-alive', 'timeout=65, max=100');
        });

        this.Fastify.addContentTypeParser('application/json', {
            parseAs: 'string'
        }, (req, body, done) => {
            if(!body) {
                done(null, {});
                return;
            }

            try {
                done(null, JSON.parse(body));
            } catch (error) {
                error.statusCode = 400;
                done(error, undefined);
            }
        });

        /* Fix empty JSON Data */
        this.Fastify.addHook('preParsing', (request, reply, payload, done) => {
            if(request.headers['content-type']?.includes('application/json') && (request.headers['content-length'] === '0' || !request.headers['content-length'])) {
                request.headers['content-length'] = '2';

                const newPayload = new Stream.Readable();
                newPayload.push('{}');
                newPayload.push(null);

                done(null, newPayload);
            } else {
                done(null, payload);
            }
        });

        /* Default route */
        if(!this.Directory) {
            this.Fastify.route({
                method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                url:    '*',
                handler: async (request, reply) => {
                    Logger.debug('WebServer', `Unknown Route: ${request.method} ${request.url}`);

                    return [{
                        error: {
                            type:           4,
                            address:        request.url,
                            description:    `method, GET, not available for resource, ${request.url}`
                        }
                    }];
                }
            });
        }

        await this.Fastify.ready();

        try {
            await this.Fastify.listen({
                port: this.Port,
                host: this.Hostname
            });

            Logger.log('Webserver', `${this.IsSecured ? 'HTTPS' : 'HTTP'} listening on ${this.IsSecured ? 'https' : 'http'}://${this.Hostname}:${this.Port}/`);
        } catch(error) {
            throw error;
        }
    }

    async startSSE(path, headers, callback) {
        await this.Fastify.register(SSE);

        let properties = {};

        for(const name of headers) {
            properties[name] = { type: 'string' };
        }

        this.Fastify.get(path, {
            schema: {
                headers: {
                    type:       'object',
                    properties: properties,
                    required:   headers
                }
            }
        }, async (request, reply) => {
            callback(request, reply);
        });
    }

    add() {
        return this.Fastify;
    }
}