/**
 * Integration Tests für CSR Provisioning
 * Testet praktische Provisioning-Szenarien gegen Mock-Server
 */
import 'reflect-metadata';
import * as http from 'node:http';
import * as crypto from 'node:crypto';
import Logger from '../../src/utils/Logger.js';
import CSRManager from '../../src/bridge/network/security/CSRManager.js';
import CryptoBridge from '../../src/bridge/network/security/CryptoBridge.js';
import * as x509 from '@peculiar/x509';

// Use WebCrypto
x509.cryptoProvider.set(crypto.webcrypto || crypto);

const TEST_CONFIG = {
    bridgeId: '001788fffe2179c6',
    portalKey: 'test_portal_key_32_bytes_minimum_',
    containerType: 'localhost',
    swVersion: '1.65.7',
    certDir: './.certs/test',  // Separate test directory (not production /certs)
    serverPort: 3001
};

let mockServer = null;

/**
 * Mock Server starten für Tests
 */
async function startMockServer() {
    return new Promise((resolve) => {
        mockServer = http.createServer((req, res) => {
            if (req.method !== 'POST' || req.url !== '/v3/cert') {
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

                    // Verify signature
                    const serverKeys = CryptoBridge.loadSigningKeys(
                        TEST_CONFIG.portalKey,
                        deviceId,
                        'signingKey_PoC'
                    );

                    const calcSig = CryptoBridge.generateHmacSignature(body, serverKeys.signingKey_B2PE);
                    if (calcSig !== clientSignature) {
                        res.writeHead(401);
                        res.end(JSON.stringify({ error: 'Signature mismatch' }));
                        return;
                    }

                    // Generate mock certificate
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

        mockServer.listen(TEST_CONFIG.serverPort, () => resolve());
    });
}

/**
 * Mock Server stoppen
 */
function stopMockServer() {
    return new Promise((resolve) => {
        if (mockServer) {
            mockServer.close(resolve);
        } else {
            resolve();
        }
    });
}

/**
 * Tests
 */
Logger.info('Provisioning', 'CSR Provisioning - Integration Tests');

async function runTests() {
    try {
        // Cleanup before tests - start with clean state
        Logger.info('Setup', 'Cleaning up old test certificates...');
        const cleanupManager = new CSRManager({
            bridgeId: TEST_CONFIG.bridgeId,
            portalKey: TEST_CONFIG.portalKey,
            containerType: 'localhost',
            swVersion: TEST_CONFIG.swVersion,
            certDirectory: TEST_CONFIG.certDir
        });
        cleanupManager.reset(true);  // Delete old test artifacts
        Logger.info('Setup', 'Cleanup complete');

        // Start mock server
        Logger.info('Setup', `Starting mock server on port ${TEST_CONFIG.serverPort}`);
        await startMockServer();

        // Test 1: Initial Provisioning
        Logger.info('Test 1', 'Initial Provisioning');
        try {
            const manager = new CSRManager({
                bridgeId: TEST_CONFIG.bridgeId,
                portalKey: TEST_CONFIG.portalKey,
                containerType: 'localhost',
                swVersion: TEST_CONFIG.swVersion,
                certDirectory: TEST_CONFIG.certDir,
                skipTlsVerify: true
            });

            // Override server URL for testing
            manager.client.serverUrl = `http://localhost:${TEST_CONFIG.serverPort}`;

            const result = await manager.provisionInitial();

            if (result.success) {
                Logger.info('Test 1', 'Initial provisioning successful');
                Logger.info('Test 1', `Certificate size: ${result.certificate.length} bytes`);
            } else {
                Logger.info('Test 1', `Initial provisioning failed: ${result.error}`);
                throw new Error(result.error);
            }
        } catch (error) {
            Logger.error('Test 1', 'Failed:', error.message);
            throw error;
        }

        // Test 2: Status Check
        Logger.info('Test 2', 'Status Check');
        try {
            const manager = new CSRManager({
                bridgeId: TEST_CONFIG.bridgeId,
                portalKey: TEST_CONFIG.portalKey,
                containerType: 'localhost',
                swVersion: TEST_CONFIG.swVersion,
                certDirectory: TEST_CONFIG.certDir
            });

            const status = manager.getStatus();

            if (status.provisioned && status.certificateExists) {
                Logger.info('Test 2', 'Status check passed');
                Logger.info('Test 2', `Provisioned: ${status.provisioned}`);
                Logger.info('Test 2', `Certificate exists: ${status.certificateExists}`);
            } else {
                Logger.info('Test 2', 'Certificate not found after provisioning');
                throw new Error('Certificate missing');
            }
        } catch (error) {
            Logger.error('Test 2', 'Failed:', error.message);
            throw error;
        }

        // Test 3: Certificate Integrity
        Logger.info('Test 3', 'Certificate Integrity Verification');
        try {
            const manager = new CSRManager({
                bridgeId: TEST_CONFIG.bridgeId,
                portalKey: TEST_CONFIG.portalKey,
                containerType: 'localhost',
                swVersion: TEST_CONFIG.swVersion,
                certDirectory: TEST_CONFIG.certDir
            });

            const integrity = manager.verifyCertificateIntegrity();

            if (integrity.valid) {
                Logger.info('Test 3', 'Certificate integrity verified');
            } else {
                Logger.info('Test 3', `Certificate integrity check failed: ${integrity.message}`);
                throw new Error('Integrity check failed');
            }
        } catch (error) {
            Logger.error('Test 3', 'Failed:', error.message);
            throw error;
        }

        // Test 4: Get Certificate
        Logger.info('Test 4', 'Retrieve Certificate');
        try {
            const manager = new CSRManager({
                bridgeId: TEST_CONFIG.bridgeId,
                portalKey: TEST_CONFIG.portalKey,
                containerType: 'localhost',
                swVersion: TEST_CONFIG.swVersion,
                certDirectory: TEST_CONFIG.certDir
            });

            const cert = manager.getCertificate();
            const url = manager.getServiceUrl();

            if (cert && cert.includes('BEGIN CERTIFICATE') && url) {
                Logger.info('Test 4', 'Certificate and service URL retrieved');
                Logger.info('Test 4', `Cert starts with: ${cert.substring(0, 30)}...`);
                Logger.info('Test 4', `Service URL: ${url}`);
            } else {
                Logger.info('Test 4', 'Failed to retrieve certificate or URL');
                throw new Error('Missing certificate or URL');
            }
        } catch (error) {
            Logger.error('Test 4', 'Failed:', error.message);
            throw error;
        }

        // Test 5: Renewal
        Logger.info('Test 5', 'Certificate Renewal');
        try {
            const manager = new CSRManager({
                bridgeId: TEST_CONFIG.bridgeId,
                portalKey: TEST_CONFIG.portalKey,
                containerType: 'localhost',
                swVersion: TEST_CONFIG.swVersion,
                certDirectory: TEST_CONFIG.certDir,
                skipTlsVerify: true
            });

            // Override server URL for testing
            manager.client.serverUrl = `http://localhost:${TEST_CONFIG.serverPort}`;

            const result = await manager.renewCertificate(false);

            if (result.success) {
                Logger.info('Test 5', 'Certificate renewal successful');
                Logger.info('Test 5', `Renewal timestamp: ${result.timestamp}`);
            } else {
                Logger.info('Test 5', `Renewal failed: ${result.error}`);
                throw new Error(result.error);
            }
        } catch (error) {
            Logger.error('Test 5', 'Failed:', error.message);
            throw error;
        }

        // Test 6: Health Check
        Logger.info('Test 6', 'Health Check');
        try {
            const manager = new CSRManager({
                bridgeId: TEST_CONFIG.bridgeId,
                portalKey: TEST_CONFIG.portalKey,
                containerType: 'localhost',
                swVersion: TEST_CONFIG.swVersion,
                certDirectory: TEST_CONFIG.certDir,
                autoRenew: false,  // Don't auto-renew for this test
                skipTlsVerify: true
            });

            const result = await manager.healthCheck();

            if (result.success) {
                Logger.info('Test 6', 'Health check passed');
                Logger.info('Test 6', `Type: ${result.type}`);
            } else {
                Logger.info('Test 6', `Health check failed: ${result.error}`);
                throw new Error(result.error);
            }
        } catch (error) {
            Logger.error('Test 6', 'Failed:', error.message);
            throw error;
        }

        // Test 7: Final Status Verification
        Logger.info('Test 7', 'Final Status & Certificate Persistence');
        try {
            const manager = new CSRManager({
                bridgeId: TEST_CONFIG.bridgeId,
                portalKey: TEST_CONFIG.portalKey,
                containerType: 'localhost',
                swVersion: TEST_CONFIG.swVersion,
                certDirectory: TEST_CONFIG.certDir
            });

            // Verify certificate still exists (NOT deleted)
            if (!manager.isCertificateProvisioned()) {
                Logger.info('Test 7', 'Certificate should still exist');
                throw new Error('Certificate was deleted but should persist');
            }

            const finalStatus = manager.getStatus();
            if (finalStatus.provisioned && finalStatus.certificateExists) {
                Logger.info('Test 7', 'Final status verified - certificate persists');
                Logger.info('Test 7', `Certificate saved to: ${manager.paths.certificate}`);
            } else {
                Logger.info('Test 7', 'Certificate persistence failed');
                throw new Error('Certificate not persisted');
            }
        } catch (error) {
            Logger.error('Test 7', 'Failed:', error.message);
            throw error;
        }

        Logger.info('Provisioning', 'All Integration Tests Passed');

    } catch (error) {
        Logger.error('Provisioning', 'Test suite failed:', error.message);
        process.exit(1);
    } finally {
        await stopMockServer();
    }
}

// Run tests
runTests();
