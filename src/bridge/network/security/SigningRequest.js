/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import CryptoBridge from './CryptoBridge.js';

/**
 * Represents a Provisioning Signing Request with HMAC-SHA256 signature.
 * Follows the Bridge→Server authentication model using signingKey_B2PE.
 */
class SigningRequest {
    /**
     * Creates a signing request payload for CSR provisioning.
     * @param {Object} options - Configuration options.
     * @param {number} options.timestamp - Unix timestamp.
     * @param {string} options.bridgeId - Bridge identifier (token).
     * @param {string} options.devicetype - Device type (e.g., "Philips hue bridge").
     * @param {string} options.certtype - Certificate type (e.g., "iot-v1").
     * @param {string} options.reason - Reason for request ("Initial", "Renewal", etc.).
     * @param {string} options.csr - The Certificate Signing Request string.
     * @param {string} options.swVersion - Software version.
     * @returns {Object} Object with payload and signature.
     */
    static create(options) {
        const {
            timestamp,
            bridgeId,
            devicetype,
            certtype,
            reason,
            csr,
            swVersion
        } = options;

        // Validate required fields
        if(!timestamp || !bridgeId || !devicetype || !certtype || !reason || !csr) {
            throw new Error('Missing required fields for signing request');
        }

        // Build the JSON payload
        return {
            timestamp,
            deviceid: bridgeId,
            devicetype,
            certtype,
            reason,
            csr,
            'sw-version': swVersion
        };
    }

    /**
     * Generates the complete signing request with HMAC signature.
     * @param {Object} payload - The request payload object.
     * @param {string} hexKey - The hex-encoded signing key (signingKey_B2PE).
     * @returns {Object} Object containing payload JSON string and signature.
     */
    static sign(payload, hexKey) {
        const payloadJson = JSON.stringify(payload);
        const signature   = CryptoBridge.generateHmacSignature(payloadJson, hexKey);

        return {
            body: payloadJson,
            signature,
            payload
        };
    }

    /**
     * Verifies a signing request signature.
     * @param {string} payloadJson - The JSON payload string.
     * @param {string} reportedSignature - The signature from the request.
     * @param {string} hexKey - The hex-encoded signing key.
     * @returns {boolean} True if signature matches, false otherwise.
     */
    static verify(payloadJson, reportedSignature, hexKey) {
        const calculatedSignature = CryptoBridge.generateHmacSignature(payloadJson, hexKey);

        return calculatedSignature === reportedSignature;
    }
}

export default SigningRequest;