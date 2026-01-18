import Plugin from '../../bridge/Plugin.js';

export default class Config extends Plugin {
    Name        = 'Config';
    Description = 'Provides the Config from the device';
    Version     = '1.0.0';

    /* GET /api/:token/config */
    getAll(request) {
        const bridge = this.getBridge();
        const config = bridge.getConfiguration();

        bridge.emit('INITIAL_CONFIG_REQUESTED');

        let device = {
            name:               config.getName(),
            apiversion:         config.getAPIVersion(),
            swversion:          `${config.getVersion()}`,
            mac:                config.getMACAddress(),
            bridgeid:           config.getId(),
            modelid:            config.getModel(),
            datastoreversion:   '180',
            factorynew:         false,
            replacesbridgeid:   null,
            starterkitid:       ''
        };

        if(request.authenticated) {
            device = {
                ...device,
                zigbeechannel:          25,
                dhcp:                   true,
                ipaddress:              config.getIPAddress(),
                netmask:                '255.255.255.0',
                gateway:                '192.168.0.1',
                proxyaddress:           'none',
                proxyport:              0,
                UTC:                    '2026-01-13T18:14:11',
                localtime:              '2026-01-13T19:14:11',
                timezone:               'Europe/Berlin',
                swupdate2: {
                    checkforupdate:     false,
                        lastchange:         '2026-01-08T13:55:02',
                        bridge: {
                        state:          'noupdates',
                            lastinstall:    '2026-01-08T13:55:02'
                    },
                    state:              'noupdates',
                        autoinstall: {
                        updatetime:     'T14:00:00',
                            on:             true
                    }
                },
                linkbutton:             bridge.getLinkButton().getState(),
                portalservices:         false,
                analyticsconsent:       false,
                portalconnection:       'disconnected',
                portalstate: {
                    signedon:           false,
                        incoming:           false,
                        outgoing:           false,
                        communication:      'disconnected'
                },
                internetservices: {
                    internet:           'connected',
                        remoteaccess:       'connected',
                        time:               'connected',
                        swupdate:           'connected'
                },
                backup: {
                    status:             'idle',
                        errorcode:          0
                },
                whitelist: bridge.getAuthentication().toJSON()
            };
        }

        return device;
    }
}
