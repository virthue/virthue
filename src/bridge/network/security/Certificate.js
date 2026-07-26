/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import FileSystem from 'node:fs/promises';
import { execSync } from 'node:child_process';
import Utils from '../../../Utils.js';

class Certificate {
    async #getCertificateSubject(certPath) {
        try {
            const openSSLEnv = { ...process.env, OPENSSL_CONF: '' };
            const output = execSync(`openssl x509 -in "${certPath}" -noout -subject`, { env: openSSLEnv }).toString();
            return output.trim();
        } catch {
            return null;
        }
    }

    async #extractCNFromSubject(subject) {
        const match = subject.match(/CN\s*=\s*([^,]+)/i);
        return match ? match[1].trim() : null;
    }

    async verify(id) {
        const cleanId = id.replace(/[:\-]/g, '').toLowerCase();
        const certDir = Utils.getPath('.certs');
        const certPath = `${certDir}\\cert.crt`;

        try {
            await FileSystem.access(certPath);
            const subject = await this.#getCertificateSubject(certPath);

            if (!subject) {
                return false;
            }

            const cn = await this.#extractCNFromSubject(subject);
            return cn === cleanId;
        } catch {
            return false;
        }
    }

    async exists() {
        const certDir = Utils.getPath('.certs');
        const certPath = `${certDir}\\cert.crt`;
        const keyPath = `${certDir}\\private.key`;

        try {
            await FileSystem.access(certPath);
            await FileSystem.access(keyPath);
            return true;
        } catch {
            return false;
        }
    }

    async generate(id) {
        const cleanId           = id.replace(/[:\-]/g, '').toLowerCase();
        const certDir           = Utils.getPath('.certs');
        const openSSLEnv = { ...process.env, OPENSSL_CONF: '' };

        try {
            // Stelle sicher, dass das Verzeichnis existiert
            await FileSystem.mkdir(certDir, { recursive: true });

            // 1. Generiere privaten EC Key (P-256)
            execSync(`openssl ecparam -name prime256v1 -genkey -noout -out "${certDir}\\private.key"`, { env: openSSLEnv });

            // 2. Generiere self-signed Zertifikat
            const subject = `/C=NL/O=Philips Hue/CN=${cleanId}`;

            execSync(`openssl req -new -x509 -key "${certDir}\\private.key" -out "${certDir}\\cert.crt" -days 7665 -subj "${subject}"`, { env: openSSLEnv });

            // 3. Lese Keys und Cert
            const privatePem = await FileSystem.readFile(`${certDir}\\private.key`, 'utf8');
            const certPem = await FileSystem.readFile(`${certDir}\\cert.crt`, 'utf8');

            // 4. Berechne Fingerprint
            const fingerprintOutput = execSync(`openssl x509 -in "${certDir}\\cert.crt" -noout -fingerprint -sha1`, { env: openSSLEnv }).toString();
            const fingerprint = fingerprintOutput.split('=')[1].trim();

            return {
                private: privatePem,
                cert: certPem,
                fingerprint
            };
        } catch (error) {
            throw new Error(`Failed to generate certificate: ${error.message}`);
        }
    }

    async #save(name, content) {
        return await FileSystem.writeFile(
            Utils.getPath('.certs', name),
            content
        );
    }
}

export default new Certificate();