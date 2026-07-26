import * as Path from 'node:path';
import * as FileSystem from 'node:fs';
import Logger from '../../src/utils/Logger.js';
import ProvisioningClient from '../../src/bridge/network/security/ProvisioningClient.js';
import CSR from '../../src/bridge/network/security/CSR.js';
import PrivateKey from '../../src/bridge/network/security/PrivateKey.js';
import CryptoBridge from '../../src/bridge/network/security/CryptoBridge.js';
import SigningRequest from '../../src/bridge/network/security/SigningRequest.js';
import ResponseValidator from '../../src/bridge/network/security/ResponseValidator.js';
import CertificateState from '../../src/bridge/network/security/CertificateState.js';

const CERT_PATH = './.certs/test';
const BRIDGE_ID = '001788fffe2179c6';
const PORTAL_KEY = 'test_portal_key_32_bytes_minimum_';

if (!FileSystem.existsSync(CERT_PATH)) {
    FileSystem.mkdirSync(CERT_PATH, { recursive: true });
}

Logger.info('Test', 'CSR Provisioning Test Suite');

// Test 1: Private Key Generation
Logger.info('Test 1', 'Private Key Generation');
try {
    const privateKeyPath = Path.join(CERT_PATH, 'test_private.pem');
    const privateKey = PrivateKey.generate(privateKeyPath);
    Logger.info('Test 1', 'Private key generated successfully');
    Logger.info('Test 1', `Path: ${privateKeyPath}`);
    Logger.info('Test 1', `Key length: ${privateKey.length} bytes`);
} catch (error) {
    Logger.error('Test 1', 'Failed:', error.message);
}

// Test 2: CSR Generation
Logger.info('Test 2', 'CSR Generation');
try {
    const privateKeyPath = Path.join(CERT_PATH, 'test_private.pem');
    const csr = CSR.generate(privateKeyPath, BRIDGE_ID, {
        country: 'NL',
        organization: 'Philips Hue',
        escapeNewlines: true
    });
    Logger.info('Test 2', 'CSR generated successfully');
    Logger.info('Test 2', `Escaped CSR (first 100 chars): ${csr.substring(0, 100)}...`);

    const unescapedCsr = CSR.unescape(csr);
    Logger.info('Test 2', `Unescaped CSR contains newlines: ${unescapedCsr.includes('\n')}`);
} catch (error) {
    Logger.error('Test 2', 'Failed:', error.message);
}

// Test 3: HKDF Key Derivation
Logger.info('Test 3', 'HKDF Key Derivation');
try {
    const keys = CryptoBridge.loadSigningKeys(PORTAL_KEY, BRIDGE_ID, 'iot-v1-prod');
    Logger.info('Test 3', 'Keys derived successfully');
    Logger.info('Test 3', `signingKey_B2PE: ${keys.signingKey_B2PE.substring(0, 16)}...`);
    Logger.info('Test 3', `signingKey_PE2B: ${keys.signingKey_PE2B.substring(0, 16)}...`);
    Logger.info('Test 3', `Both keys are 64 hex chars: ${keys.signingKey_B2PE.length === 64 && keys.signingKey_PE2B.length === 64}`);
} catch (error) {
    Logger.error('Test 3', 'Failed:', error.message);
}

// Test 4: HMAC Signature Generation
Logger.info('Test 4', 'HMAC Signature Generation');
try {
    const testPayload = JSON.stringify({
        timestamp: 1626870240,
        deviceid: BRIDGE_ID,
        devicetype: 'Philips hue bridge',
        reason: 'Initial'
    });

    const keys = CryptoBridge.loadSigningKeys(PORTAL_KEY, BRIDGE_ID, 'iot-v1-prod');
    const signature = CryptoBridge.generateHmacSignature(testPayload, keys.signingKey_B2PE);
    Logger.info('Test 4', 'HMAC signature generated successfully');
    Logger.info('Test 4', `Signature: ${signature}`);
    Logger.info('Test 4', `Is Base64: ${/^[A-Za-z0-9+/=]+$/.test(signature)}`);
} catch (error) {
    Logger.error('Test 4', 'Failed:', error.message);
}

// Test 5: SigningRequest Creation
Logger.info('Test 5', 'SigningRequest Creation');
try {
    const csr = CSR.generate(
        Path.join(CERT_PATH, 'test_private.pem'),
        BRIDGE_ID,
        { escapeNewlines: true }
    );

    const payload = SigningRequest.create({
        timestamp: Math.floor(Date.now() / 1000),
        bridgeId: BRIDGE_ID,
        devicetype: 'Philips hue bridge',
        certtype: 'iot-v1',
        reason: 'Initial',
        csr: csr,
        swVersion: '1.65.7'
    });

    Logger.info('Test 5', 'SigningRequest payload created successfully');
    Logger.info('Test 5', `Fields: ${Object.keys(payload).join(', ')}`);
} catch (error) {
    Logger.error('Test 5', 'Failed:', error.message);
}

// Test 6: SigningRequest Signing & Verification
Logger.info('Test 6', 'SigningRequest Signing & Verification');
try {
    const testPayload = { test: 'data', timestamp: 123456 };
    const keys = CryptoBridge.loadSigningKeys(PORTAL_KEY, BRIDGE_ID, 'iot-v1-prod');

    const signed = SigningRequest.sign(testPayload, keys.signingKey_B2PE);
    Logger.info('Test 6', 'SigningRequest signed successfully');

    const isValid = SigningRequest.verify(
        signed.body,
        signed.signature,
        keys.signingKey_B2PE
    );
    Logger.info('Test 6', `Signature verification: ${isValid ? '✓ Valid' : '✗ Invalid'}`);
} catch (error) {
    Logger.error('Test 6', 'Failed:', error.message);
}

// Test 7: ResponseValidator
Logger.info('Test 7', 'ResponseValidator');
try {
    const testCertPem = '-----BEGIN CERTIFICATE-----\\nMIIC...\\n-----END CERTIFICATE-----';
    const testResponseData = {
        cert: testCertPem,
        url: 'https://bridge.meethue.com:443'
    };

    const cert = ResponseValidator.extractCertificate(testResponseData);
    const url = ResponseValidator.extractServiceUrl(testResponseData);

    Logger.info('Test 7', 'ResponseValidator extraction successful');
    Logger.info('Test 7', `Certificate extracted: ${cert.includes('BEGIN')}`);
    Logger.info('Test 7', `Service URL: ${url}`);
} catch (error) {
    Logger.error('Test 7', 'Failed:', error.message);
}

// Test 8: CertificateState (Checksums)
Logger.info('Test 8', 'CertificateState (Checksums)');
try {
    const testFile = Path.join(CERT_PATH, 'test_file.txt');
    FileSystem.writeFileSync(testFile, 'test content');

    const checksum = CertificateState.computeChecksum(testFile);
    Logger.info('Test 8', 'Checksum computed successfully');
    Logger.info('Test 8', `Checksum: ${checksum.substring(0, 16)}...`);
    Logger.info('Test 8', `Length (SHA256 hex): ${checksum.length}`);

    FileSystem.unlinkSync(testFile);
} catch (error) {
    Logger.error('Test 8', 'Failed:', error.message);
}

// Test 9: ProvisioningClient Initialization
Logger.info('Test 9', 'ProvisioningClient Initialization');
try {
    const client = new ProvisioningClient({
        bridgeId: BRIDGE_ID,
        portalKey: PORTAL_KEY,
        containerType: 'HueBridge2K15',
        swVersion: '1.65.7',
        skipTlsVerify: true
    });

    Logger.info('Test 9', 'ProvisioningClient initialized successfully');
    Logger.info('Test 9', `Server URL: ${client.serverUrl}`);
    Logger.info('Test 9', `HKDF Context: ${client.hkdfCtx}`);
} catch (error) {
    Logger.error('Test 9', 'Failed:', error.message);
}

// Test 10: Full Provisioning Workflow (Dry Run)
Logger.info('Test 10', 'Full Provisioning Workflow (Dry Run)');
try {
    const client = new ProvisioningClient({
        bridgeId: BRIDGE_ID,
        portalKey: PORTAL_KEY,
        containerType: 'localhost',
        swVersion: '1.65.7',
        skipTlsVerify: true
    });

    Logger.info('Test 10', 'ProvisioningClient ready for provisioning');
    Logger.info('Test 10', `Would send request to: ${client.serverUrl}/v3/cert`);
    Logger.info('Test 10', 'Note: Actual provisioning requires running server');
} catch (error) {
    Logger.error('Test', 'Failed:', error.message);
}

Logger.info('Test', 'Test Suite Complete');
