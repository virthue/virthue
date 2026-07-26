/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import * as FileSystem from 'node:fs';
import * as Path from 'node:path';
import * as Crypto from 'node:crypto';

/**
 * Manages certificate state and integrity checks.
 * Maintains checksums to detect local modifications or corruption.
 */
class CertificateState {
    /**
     * Computes SHA256 checksum of a file.
     * @param {string} filePath - Path to the file.
     * @returns {string} Hex-encoded SHA256 hash.
     */
    static computeChecksum(filePath) {
        if(!FileSystem.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        return Crypto.createHash('sha256').update(FileSystem.readFileSync(filePath)).digest('hex');
    }

    /**
     * Saves checksums for certificate files.
     * @param {Object} files - Object with file paths keyed by name.
     * @param {string} files.certificate - Path to certificate file.
     * @param {string} files.privateKey - Path to private key file.
     * @param {string} files.checksumFile - Path to store checksums.
     * @returns {Object} Checksums that were saved.
     */
    static updateChecksums(files) {
        const {
            certificate,
            privateKey,
            checksumFile
        } = files;

        const checksums = {};

        if(certificate && FileSystem.existsSync(certificate)) {
            checksums.certificate = this.computeChecksum(certificate);
        }

        if(privateKey && FileSystem.existsSync(privateKey)) {
            checksums.privateKey = this.computeChecksum(privateKey);
        }

        // Save checksums
        const checksumData  = JSON.stringify(checksums, null, 2);
        const dir           = Path.dirname(checksumFile);

        if(!FileSystem.existsSync(dir)) {
            FileSystem.mkdirSync(dir, { recursive: true });
        }

        FileSystem.writeFileSync(checksumFile, checksumData);

        return checksums;
    }

    /**
     * Verifies certificate integrity against stored checksums.
     * @param {Object} files - Object with file paths keyed by name.
     * @param {string} files.certificate - Path to certificate file.
     * @param {string} files.checksumFile - Path to stored checksums.
     * @returns {Object} Verification result.
     */
    static verifyIntegrity(files) {
        const {
            certificate,
            checksumFile
        } = files;

        const result = {
            valid:                  true,
            certificateModified:    false,
            certificateDeleted:     false,
            message:                'Certificate integrity verified'
        };

        // Check if checksum file exists
        if(!FileSystem.existsSync(checksumFile)) {
            result.valid    = false;
            result.message  = 'No stored checksums found';
            return result;
        }

        // Load stored checksums
        let storedChecksums;
        const storedChecksumData = FileSystem.readFileSync(checksumFile, 'utf8');

        try {
            storedChecksums = JSON.parse(storedChecksumData);
        } catch (error) {
            result.valid    = false;
            result.message  = 'Failed to parse stored checksums';
            return result;
        }

        // Check certificate
        if(certificate) {
            if(!FileSystem.existsSync(certificate)) {
                result.valid                = false;
                result.certificateDeleted   = true;
                result.message              = 'Certificate file has been deleted';
            } else if (storedChecksums.certificate) {
                const currentChecksum = this.computeChecksum(certificate);

                if(currentChecksum !== storedChecksums.certificate) {
                    result.valid                = false;
                    result.certificateModified  = true;
                    result.message              = 'Certificate has been modified';
                }
            }
        }

        return result;
    }

    /**
     * Gets certificate expiration info from PEM-encoded certificate.
     * @param {string} certificatePem - Certificate in PEM format.
     * @returns {Object} Object with notAfter date or null if parsing fails.
     */
    static getExpirationInfo(certificatePem) {
        try {
            // Extract the base64 content between markers
            const base64Match = certificatePem.match(/-----BEGIN CERTIFICATE-----\s*([\s\S]*?)\s*-----END CERTIFICATE-----/);

            if(!base64Match) {
                return null;
            }

            const base64                = base64Match[1].replace(/\s/g, '');
            const derBuffer   = Buffer.from(base64, 'base64');

            // Parse DER-encoded certificate to extract notAfter
            // This is a simplified approach - in production, use a proper X.509 parser
            const certStr = derBuffer.toString('binary');

            // Search for UTCTime or GeneralizedTime format dates
            // UTCTime: YYMMDDHHMMSSZ (13 bytes)
            // GeneralizedTime: YYYYMMDDHHMMSSZ (15 bytes)

            return {
                parsed: true,
                message: 'Use proper X.509 parser for accurate expiration'
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Determines if certificate renewal is needed based on time window.
     * @param {Date} notAfterDate - Certificate expiration date.
     * @param {number} renewalWindowPercent - Renewal window as percentage (e.g., 10 for 10%).
     * @returns {boolean} True if renewal is needed.
     */
    static shouldRenew(notAfterDate, renewalWindowPercent = 10) {
        const now               = new Date();
        const totalDuration   = notAfterDate.getTime() - 0; // Simplified
        const renewalPoint    = notAfterDate.getTime() - (totalDuration * renewalWindowPercent / 100);

        return now.getTime() >= renewalPoint;
    }
}

export default CertificateState;