/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import CryptoBridge from './CryptoBridge.js';

/**
 * Validates provisioning server responses using HMAC-SHA256 signatures.
 * Follows the Server→Bridge authentication model using signingKey_PE2B.
 */
class ResponseValidator {
    /**
     * Extracts and validates the response signature header.
     * @param {Response} response - Fetch Response object.
     * @returns {string|null} The signature value or null if not present.
     */
    static extractSignatureHeader(response) {
        return response.headers.get('Signature');
    }

    /**
     * Verifies the response body signature.
     * @param {string} responseBody - The response body as a string.
     * @param {string} reportedSignature - The signature from the Signature header.
     * @param {string} hexKey - The hex-encoded signing key (signingKey_PE2B).
     * @returns {boolean} True if signature is valid, false otherwise.
     */
    static verifySignature(responseBody, reportedSignature, hexKey) {
        if(!reportedSignature) {
            throw new Error('Response signature header is missing');
        }

        const calculatedSignature = CryptoBridge.generateHmacSignature(responseBody, hexKey);
        return calculatedSignature === reportedSignature;
    }

    /**
     * Extracts certificate from response body.
     * @param {Object} responseData - Parsed JSON response body.
     * @returns {string} The certificate in PEM format.
     */
    static extractCertificate(responseData) {
        if(!responseData || !responseData.cert) {
            throw new Error('Certificate not found in response');
        }

        return ResponseValidator.unescapePem(responseData.cert);
    }

    /**
     * Extracts service URL from response body.
     * @param {Object} responseData - Parsed JSON response body.
     * @returns {string} The service URL.
     */
    static extractServiceUrl(responseData) {
        if(!responseData || !responseData.url) {
            throw new Error('Service URL not found in response');
        }

        return responseData.url;
    }

    /**
     * Unescapes newlines in PEM-encoded data.
     * @param {string} escapedPem - PEM with escaped newlines.
     * @returns {string} PEM with actual newlines.
     */
    static unescapePem(escapedPem) {
        return escapedPem.replace(/\\n/g, '\n');
    }

    /**
     * Validates HTTP response status.
     * @param {number} status - HTTP status code.
     * @returns {boolean} True if status is 200 OK.
     */
    static isOkStatus(status) {
        return status >= 200 && status < 300;
    }

    /**
     * Performs complete response validation including HTTP status, signature, and data extraction.
     * @param {Response} response - Fetch Response object.
     * @param {string} responseBody - The response body as a string.
     * @param {string} hexKey - The hex-encoded signing key (signingKey_PE2B).
     * @returns {Object} Validated response data with certificate and service URL.
     * @throws {Error} If any validation fails.
     */
    static async validate(response, responseBody, hexKey) {
        // Check HTTP status
        if(!this.isOkStatus(response.status)) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }

        // Verify signature
        const signature = this.extractSignatureHeader(response);

        if(!this.verifySignature(responseBody, signature, hexKey)) {
            throw new Error('Response signature verification failed');
        }

        // Parse and extract data
        let responseData;

        try {
            responseData = JSON.parse(responseBody);
        } catch (error) {
            throw new Error(`Failed to parse response JSON: ${error.message}`);
        }

        const certificate = this.extractCertificate(responseData);
        const serviceUrl  = this.extractServiceUrl(responseData);

        return {
            certificate,
            serviceUrl,
            signature,
            responseData
        };
    }
}

export default ResponseValidator;