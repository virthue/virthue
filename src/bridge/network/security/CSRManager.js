/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import * as FileSystem from 'node:fs';
import * as Path from 'node:path';
import Logger from '../../../utils/Logger.js';
import ProvisioningClient from './ProvisioningClient.js';
import CertificateState from './CertificateState.js';

/**
 * Manages the complete CSR provisioning lifecycle for a Bridge.
 * Handles:
 * - Initial provisioning
 * - Certificate renewal
 * - State persistence
 * - Error recovery
 */
class CSRManager {
    /**
     * Initializes the CSR Manager.
     * @param {Object} options - Configuration options.
     * @param {string} options.bridgeId - Bridge EUI-64 identifier.
     * @param {string} options.portalKey - Master key from bootloader.
     * @param {string} options.containerType - Container type (CTN).
     * @param {string} options.swVersion - Software version.
     * @param {string} options.certDirectory - Certificate storage directory.
     * @param {boolean} options.autoRenew - Enable automatic renewal (default: true).
     * @param {boolean} options.skipTlsVerify - Skip TLS verification for dev (default: false).
     */
    constructor(options) {
        const {
            bridgeId,
            portalKey,
            containerType = 'HueBridge2K15',
            swVersion,
            certDirectory = null,
            autoRenew = true,
            skipTlsVerify = false
        } = options;

        if(!bridgeId || !portalKey || !swVersion) {
            throw new Error('bridgeId, portalKey, and swVersion are required');
        }

        this.bridgeId = bridgeId;
        this.portalKey = portalKey;
        this.containerType = containerType;
        this.swVersion = swVersion;
        this.autoRenew = autoRenew;
        this.skipTlsVerify = skipTlsVerify;

        // Setup certificate directory - always use /.certs in app root
        this.certDirectory = certDirectory || Path.join(process.cwd(), '.certs');
        this.ensureCertDirectory();

        // Initialize paths
        this.paths = {
            privateKey: Path.join(this.certDirectory, 'provisioned_private.pem'),
            certificate: Path.join(this.certDirectory, 'provisioned_certificate.crt'),
            serviceConfig: Path.join(this.certDirectory, 'provisioned_service.json'),
            checksums: Path.join(this.certDirectory, 'provisioned_checksums.json'),
            stateFile: Path.join(this.certDirectory, 'csr_state.json')
        };

        // Create provisioning client
        this.client = new ProvisioningClient({
            bridgeId,
            portalKey,
            containerType,
            swVersion,
            skipTlsVerify
        });

        this.state = this.loadState();
    }

    /**
     * Ensures certificate directory exists.
     * @private
     */
    ensureCertDirectory() {
        if(!FileSystem.existsSync(this.certDirectory)) {
            FileSystem.mkdirSync(this.certDirectory, { recursive: true });
        }
    }

    /**
     * Loads persisted state from disk.
     * @private
     * @returns {Object} State object.
     */
    loadState() {
        const defaultState = {
            provisioned: false,
            initialProvisioning: null,
            lastRenewal: null,
            nextRenewalCheck: null,
            failureCount: 0,
            lastError: null
        };

        if(!FileSystem.existsSync(this.paths.stateFile)) {
            return defaultState;
        }

        try {
            const data = FileSystem.readFileSync(this.paths.stateFile, 'utf8');
            return Object.assign(defaultState, JSON.parse(data));
        } catch (error) {
            Logger.error('CSRManager', 'Failed to load CSR state:', error.message);
            return defaultState;
        }
    }

    /**
     * Persists state to disk.
     * @private
     */
    saveState() {
        try {
            FileSystem.writeFileSync(this.paths.stateFile, JSON.stringify(this.state, null, 2));
        } catch (error) {
            Logger.error('CSRManager', 'Failed to save CSR state:', error.message);
        }
    }

    /**
     * Performs initial provisioning (generates new private key and CSR).
     * @returns {Object} Provisioning result.
     */
    async provisionInitial() {
        Logger.info('CSR', `Starting initial provisioning for bridge ${this.bridgeId}`);

        try {
            const result = await this.client.provision({
                privateKeyPath: this.paths.privateKey,
                reason: 'Initial',
                generateNewKey: true
            });

            if(!result.success) {
                throw new Error(result.error);
            }

            // Save certificate and configuration
            this.saveCertificate(result.certificate);
            this.saveServiceConfig(result.serviceUrl);

            // Update checksums
            CertificateState.updateChecksums({
                certificate: this.paths.certificate,
                privateKey: this.paths.privateKey,
                checksumFile: this.paths.checksums
            });

            // Update state
            this.state.provisioned = true;
            this.state.initialProvisioning = new Date().toISOString();
            this.state.failureCount = 0;
            this.state.lastError = null;
            this.saveState();

            Logger.info('CSR', 'Initial provisioning successful');

            return {
                success: true,
                type: 'initial',
                timestamp: result.timestamp,
                certificate: result.certificate
            };
        } catch (error) {
            this.state.lastError = error.message;
            this.state.failureCount++;
            this.saveState();

            Logger.error('CSR', 'Initial provisioning failed:', error.message);
            return {
                success: false,
                type: 'initial',
                error: error.message,
                failureCount: this.state.failureCount
            };
        }
    }

    /**
     * Renews an existing certificate (reuses existing private key or generates new).
     * @param {boolean} generateNewKey - Generate new key (default: false).
     * @returns {Object} Renewal result.
     */
    async renewCertificate(generateNewKey = false) {
        Logger.info('CSR', `Starting certificate renewal for bridge ${this.bridgeId}`);

        // Check if certificate exists
        if(!this.isCertificateProvisioned()) {
            Logger.info('CSR', 'No provisioned certificate found, performing initial provisioning');
            return this.provisionInitial();
        }

        try {
            const result = await this.client.provision({
                privateKeyPath: this.paths.privateKey,
                reason: 'Renewal',
                generateNewKey
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            // Save updated certificate
            this.saveCertificate(result.certificate);

            // Update checksums
            CertificateState.updateChecksums({
                certificate: this.paths.certificate,
                privateKey: this.paths.privateKey,
                checksumFile: this.paths.checksums
            });

            // Update state
            this.state.lastRenewal = new Date().toISOString();
            this.state.failureCount = 0;
            this.state.lastError = null;
            this.saveState();

            Logger.info('CSR', 'Certificate renewal successful');

            return {
                success: true,
                type: 'renewal',
                timestamp: result.timestamp,
                certificate: result.certificate
            };
        } catch (error) {
            this.state.lastError = error.message;
            this.state.failureCount++;
            this.saveState();

            Logger.error('CSR', 'Certificate renewal failed:', error.message);
            return {
                success: false,
                type: 'renewal',
                error: error.message,
                failureCount: this.state.failureCount
            };
        }
    }

    /**
     * Verifies certificate integrity against stored checksums.
     * @returns {Object} Verification result.
     */
    verifyCertificateIntegrity() {
        const result = CertificateState.verifyIntegrity({
            certificate: this.paths.certificate,
            checksumFile: this.paths.checksums
        });

        if(!result.valid) {
            Logger.warn('CSR', 'Certificate integrity check failed:', result.message);
        }

        return result;
    }

    /**
     * Checks if certificate needs renewal based on age.
     * @param {number} renewalWindowDays - Days before expiry to trigger renewal (default: 10).
     * @returns {boolean} True if renewal is needed.
     */
    needsRenewal(renewalWindowDays = 10) {
        if(!this.state.initialProvisioning) {
            return true; // Not provisioned yet
        }

        const provisionDate = new Date(this.state.initialProvisioning);
        const now = new Date();
        const daysOld = (now - provisionDate) / (1000 * 60 * 60 * 24);

        // Certificates are valid for 90 days typically
        // Renewal window: last 10 days (80+ days old)
        return daysOld >= (90 - renewalWindowDays);
    }

    /**
     * Checks if provisioned certificate exists.
     * @returns {boolean}
     */
    isCertificateProvisioned() {
        return FileSystem.existsSync(this.paths.certificate);
    }

    /**
     * Gets the provisioned certificate.
     * @returns {string|null} Certificate in PEM format or null.
     */
    getCertificate() {
        if(!this.isCertificateProvisioned()) {
            return null;
        }

        return FileSystem.readFileSync(this.paths.certificate, 'utf8');
    }

    /**
     * Gets service configuration URL.
     * @returns {string|null} Service URL or null.
     */
    getServiceUrl() {
        if(!FileSystem.existsSync(this.paths.serviceConfig)) {
            return null;
        }

        try {
            const data = JSON.parse(
                FileSystem.readFileSync(this.paths.serviceConfig, 'utf8')
            );

            return data.url || data;
        } catch (error) {
            return null;
        }
    }

    /**
     * Gets current provisioning state.
     * @returns {Object} Current state.
     */
    getState() {
        return Object.assign({}, this.state);
    }

    /**
     * Gets provisioning status summary.
     * @returns {Object} Status summary.
     */
    getStatus() {
        const integrity = this.verifyCertificateIntegrity();

        return {
            bridgeId: this.bridgeId,
            provisioned: this.state.provisioned,
            certificateExists: this.isCertificateProvisioned(),
            integrityValid: integrity.valid,
            initialProvisioning: this.state.initialProvisioning,
            lastRenewal: this.state.lastRenewal,
            needsRenewal: this.needsRenewal(),
            failureCount: this.state.failureCount,
            lastError: this.state.lastError,
            containerType: this.containerType,
            swVersion: this.swVersion
        };
    }

    /**
     * Saves certificate to disk.
     * @private
     */
    saveCertificate(certificatePem) {
        FileSystem.writeFileSync(this.paths.certificate, certificatePem);
    }

    /**
     * Saves service configuration to disk.
     * @private
     */
    saveServiceConfig(serviceUrl) {
        const config = {
            url: serviceUrl,
            timestamp: new Date().toISOString()
        };

        FileSystem.writeFileSync(this.paths.serviceConfig, JSON.stringify(config, null, 2));
    }

    /**
     * Performs health check and auto-renewal if needed.
     * @returns {Promise<Object>} Health check result.
     */
    async healthCheck() {
        const status = this.getStatus();

        // Auto-renewal if enabled and needed
        if(this.autoRenew && status.needsRenewal && status.provisioned) {
            Logger.info('CSR', 'Auto-renewal triggered');
            return this.renewCertificate();
        }

        return {
            success: true,
            type: 'healthCheck',
            status
        };
    }

    /**
     * Resets provisioning state (for testing).
     * @param {boolean} deleteCertificates - Also delete certificate files (default: false).
     */
    reset(deleteCertificates = false) {
        if (deleteCertificates) {
            // Delete certificate files
            [this.paths.privateKey, this.paths.certificate, this.paths.serviceConfig, this.paths.checksums]
                .forEach(path => {
                    if (FileSystem.existsSync(path)) {
                        FileSystem.unlinkSync(path);
                    }
                });
        }

        // Reset state
        this.state = this.loadState();
        this.saveState();

        Logger.info('CSR', 'State reset');
    }
}

export default CSRManager;