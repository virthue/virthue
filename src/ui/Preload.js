const { contextBridge, ipcRenderer } = require('electron');

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