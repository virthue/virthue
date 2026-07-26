/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import * as Crypto from 'node:crypto';

class CryptoBridge {
    /**
     * Derives the signing keys using HKDF (matching hkdf.sh and crypto.sh).
     * @param {string} portalKey - The portal key material.
     * @param {string} bridgeId - The Bridge ID acting as salt.
     * @param {string} hkdfCtx - The context information string.
     * @returns {Object} An object containing signingKey_B2PE and signingKey_PE2B in hex.
     */
    loadSigningKeys(portalKey, bridgeId, hkdfCtx) {
        // HKDF expansion to 64 bytes (splits into two 32-byte keys)
        const keyLength            = 64;
        const salt        = Buffer.from(bridgeId, 'utf8');
        const info        = Buffer.from(hkdfCtx, 'utf8');
        const ikm         = Buffer.from(portalKey, 'utf8');

        // Node.js native hkdfSync
        const derivedKeyBuffer  = Crypto.hkdfSync('sha256', ikm, salt, info, keyLength);
        const derivedKeyHex         = Buffer.from(derivedKeyBuffer).toString('hex');
        const signingKey_B2PE       = derivedKeyHex.substring(0, 64);
        const signingKey_PE2B       = derivedKeyHex.substring(64, 128);

        return {
            signingKey_B2PE,
            signingKey_PE2B
        };
    }

    /**
     * Generates an HMAC-SHA256 signature in Base64 format (matching hmac.sh).
     * @param {string} payload - The JSON string body to sign.
     * @param {string} hexKey - The hex-encoded signing key (signingKey_B2PE).
     * @returns {string} Base64 encoded HMAC signature.
     */
    generateHmacSignature(payload, hexKey) {
        const keyBuffer  = Buffer.from(hexKey, 'hex');
        const hmac                  = Crypto.createHmac('sha256', keyBuffer);

        hmac.update(payload, 'utf8');

        return hmac.digest('base64');
    }
}

export default new CryptoBridge();