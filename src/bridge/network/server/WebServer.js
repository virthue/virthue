/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import FileSystem from 'node:fs';
import Stream from 'node:stream';
import Fastify from 'fastify';
import SSE from 'fastify-sse-v2';
import FormBody from '@fastify/formbody';
import CORS from '@fastify/cors';
import Static from '@fastify/static';

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

        this.#init();
    }

    async #init() {
        // @ToDo TLS-Certs
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
            https: !this.TLS ? null : {
                cert:    FileSystem.readFileSync('./certs/cert.pem'),
                key:    FileSystem.readFileSync('./certs/cert.pem'),
                ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256',
                honorCipherOrder: true,
                secureProtocol: 'TLSv1_2_method'
            }
        });

        /* Bind a www-dir */
        if(this.Directory) {
            await this.Fastify.register(Static, {
                root:   this.Directory,
                prefix: '/'
            });
        }

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

        await this.Fastify.register(FormBody);

        /* Enable CORS */
        await this.Fastify.register(CORS, {
            origin:     true,
            methods:    [ 'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS' ]
        });

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

        // Only for Debug
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
        if (!this.Directory) {
            this.Fastify.route({
                method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                url: '*',
                handler: async (request, reply) => {
                    console.log('Unknown Route:', request.method, request.url);

                    // @ToDo Enum + Error-Class
                    return [{
                        error: {
                            type: 4,
                            address: request.url,
                            description: `method, GET, not available for resource, ${request.url}`
                        }
                    }];
                }
            });
        }

        try {
            await this.Fastify.listen({ port: this.Port, host: this.Hostname });

            console.log(`WebServer running on Port ${this.Port}`);
        } catch (err) {
            this.Fastify.log.error(err);
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