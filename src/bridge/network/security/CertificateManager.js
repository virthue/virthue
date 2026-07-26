/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import Logger from '../../../utils/Logger.js';
import Certificate from './Certificate.js';
import CSRManager from './CSRManager.js';

class CertificateManager {
    bridge          = null;
    configuration   = null;

    constructor(bridge, configuration) {
        this.bridge         = bridge;
        this.configuration  = configuration;
    }

    async initialize() {
        const bridgeId = this.bridge.getId();
        const isCertified = this.configuration.supports('provisioning');

        if(isCertified) {
            await this.#initializeCSRProvisioning();
        } else {
            const certExists = await Certificate.exists();
            if(certExists) {
                const isValid = await Certificate.verify(bridgeId);
                if(isValid) {
                    Logger.info('TLS', `Certificate valid for Bridge ID: ${bridgeId}`);
                    return;
                }
                Logger.warn('TLS', `Certificate Bridge ID mismatch. Expected: ${bridgeId}. Regenerating...`);
            }
            Logger.info('TLS', 'Generating self-signed certificate...');
            await Certificate.generate(bridgeId);
        }
    }

    async #initializeCSRProvisioning() {
        const portalKey   = this.configuration.Portal.Key;
        const ctn       = this.configuration.Portal.CTN;

        if(!portalKey || portalKey.length < 16) {
            throw new Error(`[CSR] Invalid portal key length (${portalKey?.length || 0} chars). Key must be at least 16 characters.`);
        }

        Logger.info('CSR', 'Configuration check:');
        Logger.info('CSR', `  Bridge ID: ${this.bridge.getId()}`);
        Logger.info('CSR', `  CTN: ${ctn}`);
        Logger.info('CSR', `  Portal Key: ${portalKey.substring(0, 8)}... (length: ${portalKey.length})`);
        Logger.info('CSR', `  Supports: ${this.configuration.getSupportFlags()}`);

        if(ctn === 'localhost') {
            await this.#startMockServer();
        }

        Logger.info('CSR', 'Provisioning - Starting CSR provisioning...');

        try {
            const csr = new CSRManager({
                bridgeId:       this.bridge.getId(),
                portalKey:      portalKey,
                containerType:  ctn,
                swVersion:      this.configuration.getVersionBundle(),
                autoRenew:      true,
                skipTlsVerify:  !this.configuration.TLS.RejectUnauthorized
            });

            if(csr.isCertificateProvisioned()) {
                Logger.info('CSR', 'Using existing provisioned certificate');
                return;
            }

            Logger.info('CSR', 'Performing initial provisioning...');
            const result = await csr.provisionInitial();

            if(result.success) {
                Logger.info('CSR', 'Certificate provisioning successful');
                return;
            }

            throw new Error(`Provisioning failed: ${result.error}`);
        } catch (error) {
            throw new Error(`[CSR] Failed to provision certificate: ${error.message}`);
        }
    }

    async #startMockServer() {
        try {
            Logger.info('CSR', 'Starting mock provisioning server on localhost:3000...');

            const { default: http } = await import('node:http');
            const { default: crypto } = await import('node:crypto');
            const { default: CryptoBridge } = await import('./CryptoBridge.js');
            const { default: x509 } = await import('@peculiar/x509');

            x509.cryptoProvider.set(crypto.webcrypto || crypto);

            const mockServer = http.createServer(async (req, res) => {
                if(req.method !== 'POST' || req.url !== '/v3/cert') {
                    res.writeHead(404);
                    res.end();
                    return;
                }

                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', async () => {
                    try {
                        const deviceId = req.headers['device-id'];
                        const clientSignature = req.headers['signature'];

                        const serverKeys = CryptoBridge.loadSigningKeys(
                            this.configuration.Portal.Key,
                            deviceId,
                            'signingKey_PoC'
                        );

                        const calcSig = CryptoBridge.generateHmacSignature(body, serverKeys.signingKey_B2PE);
                        if (calcSig !== clientSignature) {
                            res.writeHead(401);
                            res.end(JSON.stringify({ error: 'Signature mismatch' }));
                            return;
                        }

                        const subtle = crypto.webcrypto?.subtle || crypto.subtle;
                        const keyPair = await subtle.generateKey(
                            { name: 'ECDSA', namedCurve: 'P-256' },
                            true,
                            ['sign', 'verify']
                        );

                        const cert = await x509.X509CertificateGenerator.create({
                            serialNumber: deviceId.replace(/[^0-9a-f]/g, ''),
                            subject: `C=NL,O=Philips Hue,CN=${deviceId}`,
                            issuer: `C=NL,O=Philips Hue,CN=${deviceId}`,
                            notBefore: new Date(),
                            notAfter: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                            signingAlgorithm: { name: 'ECDSA', hash: 'SHA-256' },
                            publicKey: keyPair.publicKey,
                            signingKey: keyPair.privateKey,
                            extensions: [
                                new x509.BasicConstraintsExtension(true, 0, true),
                                await x509.SubjectKeyIdentifierExtension.create(keyPair.publicKey)
                            ]
                        });

                        const certPem = cert.toString('pem').replace(/\n/g, '\\n');
                        const response = JSON.stringify({
                            cert: certPem,
                            url: 'https://bridge.meethue.com:443'
                        });

                        const serverSig = CryptoBridge.generateHmacSignature(response, serverKeys.signingKey_PE2B);

                        res.writeHead(200, {
                            'Content-Type': 'application/json',
                            'Signature': serverSig
                        });
                        res.end(response);
                    } catch (error) {
                        res.writeHead(500);
                        res.end(JSON.stringify({ error: error.message }));
                    }
                });
            });

            return new Promise((resolve) => {
                mockServer.listen(3000, () => {
                    Logger.info('CSR', 'Mock server running on http://localhost:3000');
                    resolve();
                });
            });
        } catch (error) {
            Logger.warn('CSR', 'Failed to start mock server:', error.message);
            throw new Error('Mock server startup failed');
        }
    }
}

export default CertificateManager;