import OperatingSystem from 'node:os';

export default new class Interfaces {
    getAddress(family = 'IPv4') {
        const interfaces = OperatingSystem.networkInterfaces();

        for(const name of Object.keys(interfaces)) {
            for(const iface of interfaces[name]) {
                if(iface.internal) {
                    continue;
                }

                if(iface.family === family) {
                    return iface.address;
                }
            }
        }

        return null;
    }
}