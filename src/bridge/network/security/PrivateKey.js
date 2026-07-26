/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import { generateKeyPairSync } from 'node:crypto';
import * as FileSystem from 'node:fs';
import * as Path from 'node:path';

class PrivateKey {
    /**
     * Generates a new ECC private key using the prime256v1 (secp256r1) curve
     * and saves it to the specified file path.
     * @param {string} filePath - Path where the private key PEM file should be saved.
     * @returns {string} The private key in PEM format.
     */
    generate(filePath) {
        const { privateKey } = generateKeyPairSync('ec', {
            namedCurve: 'prime256v1',
            publicKeyEncoding: {
                type:   'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type:   'sec1',
                format: 'pem'
            }
        });

        if(filePath) {
            const dir = Path.dirname(filePath);

            if(!FileSystem.existsSync(dir)) {
                FileSystem.mkdirSync(dir, { recursive: true });
            }

            FileSystem.writeFileSync(filePath, privateKey, { mode: 0o600 });
        }

        return privateKey;
    }

    /**
     * Reads a private key from a file.
     * @param {string} filePath - Path to the private key PEM file.
     * @returns {string} The private key in PEM format.
     */
    read(filePath) {
        if(!FileSystem.existsSync(filePath)) {
            throw new Error(`Private key file not found: ${filePath}`);
        }

        return FileSystem.readFileSync(filePath, 'utf8');
    }
}

export default new PrivateKey();