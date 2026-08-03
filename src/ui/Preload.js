/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('I18N', {
    __: async (string) => {
        return await ipcRenderer.invoke('I18N:__', string);
    },
    __sp: async (singular, plural, count) => {
        return await ipcRenderer.invoke('I18N:__sp', singular, plural, count);
    },
    setLanguage: async (lang) => {
        return await ipcRenderer.invoke('I18N:setLanguage', lang);
    },
    getLanguage: async () => {
        return await ipcRenderer.invoke('I18N:getLanguage');
    }
});

contextBridge.exposeInMainWorld('IPC', {
    on: (channel, callback) => {
        ipcRenderer.on(channel, (_, data) => {
            console.info('[IPC]', 'on', channel, data);
            callback(data);
        });
    },
    send: (channel, data) => {
        console.info('[IPC]', 'send', channel, data);
        ipcRenderer.send(channel, data);
    }
});