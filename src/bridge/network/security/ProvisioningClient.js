/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import PrivateKey from './PrivateKey.js';
import CSR from './CSR.js';
import CryptoBridge from './CryptoBridge.js';
import SigningRequest from './SigningRequest.js';
import ResponseValidator from './ResponseValidator.js';

/**
 * Orchestrates the complete CSR provisioning workflow.
 * Follows the Philips Hue Bridge provisioning protocol.
 */
class ProvisioningClient {
    /**
     * Configuration for different bridge environments.
     */
    static CONFIG_PROFILES = {
        'HueBridge2K15': {
            serverUrl:  'https://provision.meethue.com',
            hkdfCtx:    'iot-v1-prod'
        },
        'HBsystem': {
            serverUrl:  'https://provision-system.meethue.com',
            hkdfCtx:    'iot-v1-system'
        },
        'HBPortal': {
            serverUrl:  'https://provision-system.meethue.com',
            hkdfCtx:    'iot-v1-system'
        },
        'HBDev': {
            serverUrl:  'https://provision-dev.meethue.com',
            hkdfCtx:    'iot-v1-dev'
        },
        'localhost': {
            serverUrl:  'http://localhost:3000',
            hkdfCtx:    'signingKey_PoC'
        }
    };

    /**
     * Initializes the provisioning client with configuration.
     * @param {Object} options - Configuration options.
     * @param {string} options.bridgeId - Bridge ID (EUI-64).
     * @param {string} options.portalKey - Master key from bootloader.
     * @param {string} options.containerType - Container Type (CTN).
     * @param {string} options.protocolVersion - Protocol version (default: "3").
     * @param {string} options.keyVersion - Key derivation version (default: "2").
     * @param {string} options.swVersion - Software version.
     * @param {string} options.certType - Certificate type (default: "iot-v1").
     * @param {boolean} options.skipTlsVerify - Skip TLS verification for dev (default: false).
     */
    constructor(options) {
        const {
            bridgeId,
            portalKey,
            containerType   = 'HueBridge2K15',
            protocolVersion = '3',
            keyVersion      = '2',
            swVersion,
            certType        = 'iot-v1',
            skipTlsVerify = false
        } = options;

        if(!bridgeId) {
            throw new Error('bridgeId is required');
        }

        if(!portalKey) {
            throw new Error('portalKey is required');
        }

        if(!swVersion) {
            throw new Error('swVersion is required');
        }

        this.bridgeId           = bridgeId;
        this.portalKey          = portalKey;
        this.protocolVersion    = protocolVersion;
        this.keyVersion         = keyVersion;
        this.swVersion          = swVersion;
        this.certType           = certType;
        this.skipTlsVerify      = skipTlsVerify;

        // Get profile configuration
        const profile = ProvisioningClient.CONFIG_PROFILES[containerType] || ProvisioningClient.CONFIG_PROFILES['localhost'];
        this.serverUrl                          = profile.serverUrl;
        this.hkdfCtx                            = profile.hkdfCtx;

        // Derive signing keys once during initialization
        this.signingKeys = CryptoBridge.loadSigningKeys(
            portalKey,
            bridgeId,
            this.hkdfCtx
        );
    }

    /**
     * Performs the complete provisioning workflow.
     * @param {Object} options - Provisioning options.
     * @param {string} options.privateKeyPath - Path to store/load private key.
     * @param {string} options.reason - Request reason ("Initial" or "Renewal").
     * @param {boolean} options.generateNewKey - Generate new private key (default: true).
     * @returns {Object} Provisioning result with certificate and service URL.
     */
    async provision(options) {
        const {
            privateKeyPath,
            reason          = 'Initial',
            generateNewKey = true
        } = options;

        if(!privateKeyPath) {
            throw new Error('privateKeyPath is required');
        }

        try {
            // Step 1: Generate or load private key
            let privateKeyPem;

            if(generateNewKey) {
                privateKeyPem = PrivateKey.generate(privateKeyPath);
            } else {
                privateKeyPem = PrivateKey.read(privateKeyPath);
            }

            // Step 2: Generate CSR
            const csrPem = CSR.generate(privateKeyPath, this.bridgeId, {
                country:        'NL',
                organization:   'Philips Hue',
                escapeNewlines: true
            });

            // Step 3: Create signing request payload
            const payload = SigningRequest.create({
                timestamp:  Math.floor(Date.now() / 1000),
                bridgeId:   this.bridgeId,
                devicetype: 'Philips hue bridge',
                certtype:   this.certType,
                reason,
                csr:        csrPem,
                swVersion:  this.swVersion
            });

            // Step 4: Sign the request
            const { body, signature } = SigningRequest.sign(payload, this.signingKeys.signingKey_B2PE);

            // Step 5: Send request to server
            const response = await this._sendRequest(body, signature);

            // Check HTTP status
            if(!response.ok) {
                const responseBody = await response.text();

                console.error(`[CSR] HTTP ${response.status} ${response.statusText}`);
                console.error(`[CSR] Response: ${responseBody.substring(0, 200)}`);

                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Step 6: Validate response
            const responseBody      = await response.text();
            const validatedResponse   = await ResponseValidator.validate(response, responseBody, this.signingKeys.signingKey_PE2B);

            return {
                success:        true,
                certificate:    validatedResponse.certificate,
                serviceUrl:     validatedResponse.serviceUrl,
                bridgeId:       this.bridgeId,
                timestamp:      payload.timestamp
            };
        } catch (error) {
            return {
                success:    false,
                error:      error.message,
                bridgeId:   this.bridgeId
            };
        }
    }

    /**
     * Sends the provisioning request to the server.
     * @private
     * @param {string} payloadJson - The JSON payload body.
     * @param {string} signature - The HMAC-SHA256 signature.
     * @returns {Response} Fetch Response object.
     */
    async _sendRequest(payloadJson, signature) {
        const url = `${this.serverUrl}/v3/cert`;

        const fetchOptions = {
            method: 'POST',
            headers: {
                // I don't know it's relevant, but originally headers has these exact typo!
                'Content-Type':         'application/json',
                'protocol-version':     this.protocolVersion,
                'key-version':          this.keyVersion,
                'sw-version':           this.swVersion,
                'Device-Id':            this.bridgeId,
                'Signature':            signature,
                'alg':                  'HS256'
            },
            body: payloadJson
        };

        try {
            console.log(`[CSR] Configuration:`);
            console.log(`  Server URL: ${url}`);
            console.log(`  Bridge ID: ${this.bridgeId}`);
            console.log(`  CTN: ${Object.keys(ProvisioningClient.CONFIG_PROFILES).find(key => ProvisioningClient.CONFIG_PROFILES[key].serverUrl === this.serverUrl)}`);
            console.log(`  TLS Verify: ${!this.skipTlsVerify}`);
            console.log(`[CSR] Sending request to ${url}...`);

            // Disable TLS verification if configured
            if(this.skipTlsVerify) {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            }

            const response = await fetch(url, fetchOptions);

            // Log HTTP status
            console.log(`[CSR] HTTP Status: ${response.status} ${response.statusText}`);

            return response;
        } catch (error) {
            console.error(`[CSR] ✗ Network Request Failed!`);
            console.error(`[CSR]`);
            console.error(`[CSR] Server:        ${this.serverUrl}`);
            console.error(`[CSR] Error:         ${error.message}`);
            console.error(`[CSR] Error Code:    ${error.code || 'N/A'}`);
            console.error(`[CSR]`);
            console.error(`[CSR] ⚠️  Diagnostik:`);

            if(error.code === 'ECONNREFUSED') {
                console.error(`[CSR]   Server-Verbindung abgelehnt`);
                console.error(`[CSR]   Server läuft nicht oder ist nicht erreichbar`);
                console.error(`[CSR]   Überprüfe CTN-Konfiguration`);
            } else if(error.message.includes('getaddrinfo') || error.message.includes('ENOTFOUND')) {
                console.error(`[CSR]   Hostname kann nicht aufgelöst werden`);
                console.error(`[CSR]   DNS-Problem oder Netzwerkfehler`);
                console.error(`[CSR]   Teste: ping provision.meethue.com`);
            } else if(error.message.includes('ECONNRESET')) {
                console.error(`[CSR]   Verbindung vom Server zurückgesetzt`);
                console.error(`[CSR]   Server-Problem oder Timeout`);
            } else if(error.message.includes('CERT') || error.message.includes('certificate')) {
                console.error(`[CSR]   TLS/SSL-Zertifikat Problem`);
                console.error(`[CSR]   Versuche: export NODE_TLS_REJECT_UNAUTHORIZED=0`);
            } else {
                console.error(`[CSR]   Netzwerk nicht erreichbar`);
                console.error(`[CSR]   Firewall, Proxy oder VPN Problem`);
                console.error(`[CSR]   Überprüfe Internetverbindung`);
            }

            console.error(`[CSR]`);
            console.error(`[CSR] Lösung für Tests:`);
            console.error(`[CSR]  export CTN=localhost`);
            console.error(`[CSR]  npm run start`);
            console.error(`[CSR]`);

            throw new Error(`Network request to ${this.serverUrl} failed: ${error.message}`);
        } finally {
            if(this.skipTlsVerify) {
                delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
            }
        }
    }

    /**
     * Gets configuration for a specific container type.
     * @param {string} containerType - The container type.
     * @returns {Object} Configuration object with serverUrl and hkdfCtx.
     */
    static getConfig(containerType) {
        return this.CONFIG_PROFILES[containerType] || this.CONFIG_PROFILES['localhost'];
    }
}

export default ProvisioningClient;