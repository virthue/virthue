/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import FileSystem from 'node:fs/promises';
import Stream from 'node:stream';
import Fastify from 'fastify';
import SSE from 'fastify-sse-v2';
import FormBody from '@fastify/formbody';
import CORS from '@fastify/cors';
import Static from '@fastify/static';
import Utils from '../../../Utils.js';

export default class WebServer {
    Hostname    = null;
    Port        = null;
    Directory   = null;
    TLS      = false;
    Fastify     = null;

    constructor(hostname, port, secure = false, directory) {
        this.Hostname   = hostname;
        this.Port       = port;
        this.TLS        = secure;
        this.Directory  = directory;
    }

    async #loadCertificates(files, options) {
        let result = {
            ...options
        };

        try {
            const [key, cert, ca] = await Promise.all([
                FileSystem.readFile(files.key, 'utf8').catch(() => null),
                FileSystem.readFile(files.cert, 'utf8').catch(() => null),
                files.ca ? FileSystem.readFile(files.ca, 'utf8').catch(() => null) : null
            ]);

            if(!key || !cert) {
                console.warn("Zertifikate unvollständig: Key oder Cert fehlt. Fallback auf HTTP.");
                return null;
            }

            result.key      = key;
            result.cert     = cert;

            if(ca) {
                result.ca   = ca;
            }

            return result;
        } catch(error) {
            console.error("Fehler beim Laden der Zertifikate:", error);
            return null;
        }
    }

    async init() {
        let certificates = (this.TLS ? await this.#loadCertificates({
            key:    Utils.getPath('certs', 'private.key'),
            cert:   Utils.getPath('certs', 'cert.crt')
        }, {
            ciphers: [
                'ECDHE-ECDSA-AES128-GCM-SHA256',
                'ECDHE-ECDSA-AES256-GCM-SHA384',
                'ECDHE-RSA-AES128-GCM-SHA256'
            ].join(':'),
            honorCipherOrder:   true
        }) : {});

        this.Fastify = Fastify({
            routerOptions: {
                ignoreTrailingSlash: true,
                caseSensitive: false
            },
            ajv: {
                customOptions: {
                    strict: false
                }
            },
            logger: {
                transport: {
                    target: 'pino-pretty'
                }
            },
            ...(this.TLS ? {
                https: certificates
            } : {})
        });

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

        // Debug Hook @ToDo forward to Traffic UI
        this.Fastify.addHook('onRequest', async (request, reply) => {
            console.log('\n========================================');
            console.log('ALLE REQUESTS:');
            console.log('Methode:', request.method);
            console.log('URL:', request.url);
            console.log('Raw URL:', request.raw.url);
            console.log('Query:', request.query);
            console.log('Headers:', request.headers);
            console.log('Content-Type:', request.headers['content-type']);
            console.log('========================================\n');
        });

        /* Default route */
        if(!this.Directory) {
            this.Fastify.route({
                method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                url:    '*',
                handler: async (request, reply) => {
                    console.log('Unknown Route:', request.method, request.url);
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

        this.Fastify.server.on('tlsClientError', (err) => {
            console.error('TLS Client Error:', err);
        });

        this.Fastify.server.on('error', (err) => {
            console.error('Server Error:', err);
        });

        try {
            await this.Fastify.listen({
                port: this.Port,
                host: this.Hostname
            });
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