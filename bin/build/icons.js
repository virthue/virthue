import FileSystem from 'node:fs';
import Path from 'node:path';
import SVG2ICO from 'svg-to-ico';
import SVG2IMG from 'svg2img';
import Utils from '../../src/Utils.js';

(new class IconBuilder {
    Path                = null;
    Sizes     = {
        Logo:   [ 16, 24, 32, 64, 128 ],
        Menu:   [ 16 ]
    };

    constructor() {
        console.log('Building icons...');

        this.Path = Utils.getPath('assets', 'icons');

        this.#start();
    }

    #start() {
        FileSystem.readdirSync(this.Path).filter(file => file.endsWith('.svg')).forEach(file => {
            const name  = Path.basename(file, '.svg');
            let sizes = this.Sizes.Menu;

            if(name === 'logo') {
                sizes = this.Sizes.Logo;
            }

            const source = Utils.getPath('assets', 'icons', file);

            /* Convert to ICO  */
            SVG2ICO({
                input_name:     source,
                output_name:    Utils.getPath('assets', 'icons', `${name}.ico`),
                sizes:          sizes
            }).then(() => {
                console.log(`[OK] Converted: ${name} (${sizes})`);
            }).catch((error) => {
                console.log(`[ERROR] Converted: ${name}`, error);
            });

            /* Convert to PNG */
            SVG2IMG(source, {
                format: 'png'
            }, function(error, buffer) {
                if(error) {
                    console.log(`[ERROR] Converted: ${name}`, error);
                    return;
                }

                console.log(`[OK] Converted: ${name} (${sizes})`);
                FileSystem.writeFileSync(Utils.getPath('assets', 'icons', `${name}.png`), buffer);
            });
        });
    }
}());