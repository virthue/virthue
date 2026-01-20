import FileSystem from 'node:fs/promises';
import Signer from 'selfsigned';
import Utils from "../../../Utils.js";

export default (new class Certificate {
    async generate(id) {
        const queue = [];

        // @ToDo Issuer: root-bridge, Philips Hue?
        const time_from             = new Date('2017-01-01');
        const time_to               = new Date(time_from);

        time_to.setFullYear(time_to.getFullYear() + 21);

        const serial               = BigInt('0x' + id.replace(/[:\-\u200e]/g, '')).toString();
        const certificates  = await Signer.generate([{
            name:   'commonName',
            value:  id
        },  {
            name:   'countryName',
            value:  'NL'
        }, {
            name:   'organizationName',
            value:  'Philips Hue'
        }], {
            clientCertificate:  true,
            keyType:            'ec',
            algorithm:          'sha256',
            curve:              'P-256',
            keySize:            2048,
            notBeforeDate:      time_from,
            notAfterDate:       time_to,
            serialNumber:       serial
        });

        if(certificates.private) {
            queue.push(this.#save('private.key', certificates.private).then(() => {
                //console.log('Generated private key');
            }).catch(error => {
                console.log(error);
            }));
        }

        if(certificates.public) {
            queue.push(this.#save('public.key', certificates.public).then(() => {
                //console.log('Generated public key');
            }).catch(error => {
                console.log(error);
            }));
        }

        if(certificates.cert) {
            queue.push(this.#save('cert.crt', certificates.cert).then(() => {
                //console.log('Generated certificate');
            }).catch(error => {
                console.log(error);
            }));
        }

        if(certificates.private && certificates.cert) {
            queue.push(this.#save('cert.pem', certificates.private + certificates.cert).then(() => {
                // console.log('Generated bundled certificate');
            }).catch(error => {
                console.log(error);
            }));
        }

        await Promise.all(queue);
        console.log('Generated TLS-Certificate with Fingerprint:', certificates.fingerprint);
    }

    async #save(name, content) {
        return await FileSystem.writeFile(Utils.getPath('certs', name), content);
    }
}());