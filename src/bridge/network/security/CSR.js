/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import { execSync } from 'node:child_process';
import * as FileSystem from 'node:fs';

class CSR {
    /**
     * Generates a Certificate Signing Request (CSR) using an existing private key file.
     * Mimics the bridge's create_csr function.
     * @param {string} privateKeyPath - Path to the private key PEM file.
     * @param {string} bridgeId - The Bridge ID (Common Name, CN).
     * @param {Object} options - Additional options.
     * @param {string} options.country - Country code (default: NL).
     * @param {string} options.organization - Organization name (default: Philips Hue).
     * @param {boolean} options.escapeNewlines - Escape newlines for JSON (default: true).
     * @returns {string} The CSR string, with escaped newlines if requested.
     */
    generate(privateKeyPath, bridgeId, options = {}) {
        if(!bridgeId) {
            throw new Error('Bridge ID is required');
        }

        if(!FileSystem.existsSync(privateKeyPath)) {
            throw new Error(`Private key file not found: ${privateKeyPath}`);
        }

        const {
            country = 'NL',
            organization = 'Philips Hue',
            escapeNewlines = true
        } = options;

        const subject = `/C=${country}/O=${organization}/CN=${bridgeId}`;

        try {
            const csr = execSync(
                `openssl req -new -key "${privateKeyPath}" -subj "${subject}" -batch`,
                { encoding: 'utf8' }
            );

            // Remove trailing whitespace
            let result = csr.trim();

            // Escape newlines for JSON if requested
            if(escapeNewlines) {
                result = result.replace(/\n/g, '\\n');
            }

            return result;
        } catch (error) {
            throw new Error(`Failed to generate CSR: ${error.message}`);
        }
    }

    /**
     * Unescapes newlines from JSON format.
     * @param {string} escapedCsr - CSR with escaped newlines.
     * @returns {string} CSR with actual newlines.
     */
    unescape(escapedCsr) {
        return escapedCsr.replace(/\\n/g, '\n');
    }
}

export default new CSR();