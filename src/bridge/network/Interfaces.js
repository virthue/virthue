/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import OperatingSystem from 'node:os';

/**
 * IP Address Family Enum
 */
export const Family = Object.freeze({
    IPv4: 'IPv4',
    IPv6: 'IPv6'
});

export default new class Interfaces {
    /**
     * Get network address by IP family
     * @param {Family} family - Family.IPv4 or Family.IPv6
     * @returns {string|null} IP address or null if not found
     */
    getAddress(family = Family.IPv4) {
        const interfaces = OperatingSystem.networkInterfaces();

        for(const name of Object.keys(interfaces)) {
            for(const device of interfaces[name]) {
                if(device.internal) {
                    continue;
                }

                if(device.family === family) {
                    if(family === Family.IPv6 && this.#isLinkLocal(device.address)) {
                        continue;
                    }

                    return device.address;
                }
            }
        }

        return null;
    }

    /**
     * Check if IPv6 is available
     *
     * @returns {boolean}
     */
    hasIPv6() {
        return this.getAddress(Family.IPv6) !== null;
    }

    /**
     * Check if IPv4 is available
     *
     * @returns {boolean}
     */
    hasIPv4() {
        return this.getAddress(Family.IPv4) !== null;
    }

    /**
     * Check if IPv6 address is link-local (fe80::/10)
     *
     * @private
     */
    #isLinkLocal(address) {
        return address.toLowerCase().startsWith('fe80:');
    }
}