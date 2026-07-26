import * as Path from 'node:path';
import * as FileSystem from 'node:fs';
import ProvisioningClient from '../../src/bridge/network/security/ProvisioningClient.js';
import CSR from '../../src/bridge/network/security/CSR.js';
import PrivateKey from '../../src/bridge/network/security/PrivateKey.js';
import CryptoBridge from '../../src/bridge/network/security/CryptoBridge.js';
import SigningRequest from '../../src/bridge/network/security/SigningRequest.js';
import ResponseValidator from '../../src/bridge/network/security/ResponseValidator.js';
import CertificateState from '../../src/bridge/network/security/CertificateState.js';

const CERT_PATH = './certs_test';
const BRIDGE_ID = '001788fffe2179c6';
const PORTAL_KEY = 'test_portal_key_32_bytes_minimum_';

// Ensure cert directory exists
if (!FileSystem.existsSync(CERT_PATH)) {
    FileSystem.mkdirSync(CERT_PATH, { recursive: true });
}

console.log('\n=== CSR Provisioning Test Suite ===\n');

// Test 1: Private Key Generation
console.log('Test 1: Private Key Generation');
try {
    const privateKeyPath = Path.join(CERT_PATH, 'test_private.pem');
    const privateKey = PrivateKey.generate(privateKeyPath);
    console.log('✓ Private key generated successfully');
    console.log(`  Path: ${privateKeyPath}`);
    console.log(`  Key length: ${privateKey.length} bytes`);
} catch (error) {
    console.error('✗ Failed:', error.message);
}

// Test 2: CSR Generation
console.log('\nTest 2: CSR Generation');
try {
    const privateKeyPath = Path.join(CERT_PATH, 'test_private.pem');
    const csr = CSR.generate(privateKeyPath, BRIDGE_ID, {
        country: 'NL',
        organization: 'Philips Hue',
        escapeNewlines: true
    });
    console.log('✓ CSR generated successfully');
    console.log(`  Escaped CSR (first 100 chars): ${csr.substring(0, 100)}...`);

    // Test unescape
    const unescapedCsr = CSR.unescape(csr);
    console.log(`  Unescaped CSR contains newlines: ${unescapedCsr.includes('\n')}`);
} catch (error) {
    console.error('✗ Failed:', error.message);
}

// Test 3: HKDF Key Derivation
console.log('\nTest 3: HKDF Key Derivation');
try {
    const keys = CryptoBridge.loadSigningKeys(PORTAL_KEY, BRIDGE_ID, 'iot-v1-prod');
    console.log('✓ Keys derived successfully');
    console.log(`  signingKey_B2PE: ${keys.signingKey_B2PE.substring(0, 16)}...`);
    console.log(`  signingKey_PE2B: ${keys.signingKey_PE2B.substring(0, 16)}...`);
    console.log(`  Both keys are 64 hex chars: ${keys.signingKey_B2PE.length === 64 && keys.signingKey_PE2B.length === 64}`);
} catch (error) {
    console.error('✗ Failed:', error.message);
}

// Test 4: HMAC Signature Generation
console.log('\nTest 4: HMAC Signature Generation');
try {
    const testPayload = JSON.stringify({
        timestamp: 1626870240,
        deviceid: BRIDGE_ID,
        devicetype: 'Philips hue bridge',
        reason: 'Initial'
    });

    const keys = CryptoBridge.loadSigningKeys(PORTAL_KEY, BRIDGE_ID, 'iot-v1-prod');
    const signature = CryptoBridge.generateHmacSignature(testPayload, keys.signingKey_B2PE);
    console.log('✓ HMAC signature generated successfully');
    console.log(`  Signature: ${signature}`);
    console.log(`  Is Base64: ${/^[A-Za-z0-9+/=]+$/.test(signature)}`);
} catch (error) {
    console.error('✗ Failed:', error.message);
}

// Test 5: SigningRequest Creation
console.log('\nTest 5: SigningRequest Creation');
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

    console.log('✓ SigningRequest payload created successfully');
    console.log(`  Fields: ${Object.keys(payload).join(', ')}`);
} catch (error) {
    console.error('✗ Failed:', error.message);
}

// Test 6: SigningRequest Signing & Verification
console.log('\nTest 6: SigningRequest Signing & Verification');
try {
    const testPayload = { test: 'data', timestamp: 123456 };
    const keys = CryptoBridge.loadSigningKeys(PORTAL_KEY, BRIDGE_ID, 'iot-v1-prod');

    const signed = SigningRequest.sign(testPayload, keys.signingKey_B2PE);
    console.log('✓ SigningRequest signed successfully');

    const isValid = SigningRequest.verify(
        signed.body,
        signed.signature,
        keys.signingKey_B2PE
    );
    console.log(`  Signature verification: ${isValid ? '✓ Valid' : '✗ Invalid'}`);
} catch (error) {
    console.error('✗ Failed:', error.message);
}

// Test 7: ResponseValidator
console.log('\nTest 7: ResponseValidator');
try {
    const testCertPem = '-----BEGIN CERTIFICATE-----\\nMIIC...\\n-----END CERTIFICATE-----';
    const testResponseData = {
        cert: testCertPem,
        url: 'https://bridge.meethue.com:443'
    };

    const cert = ResponseValidator.extractCertificate(testResponseData);
    const url = ResponseValidator.extractServiceUrl(testResponseData);

    console.log('✓ ResponseValidator extraction successful');
    console.log(`  Certificate extracted: ${cert.includes('BEGIN')}`);
    console.log(`  Service URL: ${url}`);
} catch (error) {
    console.error('✗ Failed:', error.message);
}

// Test 8: CertificateState (Checksums)
console.log('\nTest 8: CertificateState (Checksums)');
try {
    const testFile = Path.join(CERT_PATH, 'test_file.txt');
    FileSystem.writeFileSync(testFile, 'test content');

    const checksum = CertificateState.computeChecksum(testFile);
    console.log('✓ Checksum computed successfully');
    console.log(`  Checksum: ${checksum.substring(0, 16)}...`);
    console.log(`  Length (SHA256 hex): ${checksum.length}`);

    FileSystem.unlinkSync(testFile);
} catch (error) {
    console.error('✗ Failed:', error.message);
}

// Test 9: ProvisioningClient Initialization
console.log('\nTest 9: ProvisioningClient Initialization');
try {
    const client = new ProvisioningClient({
        bridgeId: BRIDGE_ID,
        portalKey: PORTAL_KEY,
        containerType: 'HueBridge2K15',
        swVersion: '1.65.7',
        skipTlsVerify: true
    });

    console.log('✓ ProvisioningClient initialized successfully');
    console.log(`  Server URL: ${client.serverUrl}`);
    console.log(`  HKDF Context: ${client.hkdfCtx}`);
} catch (error) {
    console.error('✗ Failed:', error.message);
}

// Test 10: Full Provisioning Workflow (Dry Run)
console.log('\nTest 10: Full Provisioning Workflow (Dry Run)');
try {
    const client = new ProvisioningClient({
        bridgeId: BRIDGE_ID,
        portalKey: PORTAL_KEY,
        containerType: 'localhost',
        swVersion: '1.65.7',
        skipTlsVerify: true
    });

    console.log('✓ ProvisioningClient ready for provisioning');
    console.log(`  Would send request to: ${client.serverUrl}/v3/cert`);
    console.log('  Note: Actual provisioning requires running server');
} catch (error) {
    console.error('✗ Failed:', error.message);
}

console.log('\n=== Test Suite Complete ===\n');