/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import OperatingSystem from 'node:os';

export default new class Interfaces {
    getAddress(family = 'IPv4') {
        const interfaces = OperatingSystem.networkInterfaces();

        for(const name of Object.keys(interfaces)) {
            for(const device of interfaces[name]) {
                if(device.internal) {
                    continue;
                }

                if(device.family === family) {
                    return device.address;
                }
            }
        }

        return null;
    }
}