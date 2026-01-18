import FileSystem from 'node:fs';
import Utils from '../../src/Utils.js';

(new class LicenseBuilder {
    Package = null;
    Locking = null;

    constructor() {
        console.log('Building licenses...');

        try {
            this.Package = JSON.parse(
                FileSystem.readFileSync(Utils.getPath('package.json'), 'utf-8')
            );
        } catch(error) {
            /* Do Nothing */
        }

        try {
            this.Locking = JSON.parse(
                FileSystem.readFileSync(Utils.getPath('package-lock.json'), 'utf-8')
            );
        } catch(error) {
            /* Do Nothing */
        }

        if(!this.Package) {
            console.error('Could not load package-lock.json!');
            return;
        }

        this.#start();
    }

    async #start() {
        let licenses = [];

        if(this.Package.dependencies) {
            for(const id in this.Package.dependencies) {
                const version = this.resolveVersion(id, this.Package.dependencies[id]);

                licenses.push({
                    id,
                    ...(await this.fetching(id, version))
                });
            }
        }

        if(this.Package.devDependencies) {
            for(const id in this.Package.devDependencies) {
                const version = this.resolveVersion(id, this.Package.devDependencies[id]);

                licenses.push({
                    id,
                    ...(await this.fetching(id, version))
                });
            }
        }

        console.log('Builded Licenses:', licenses.length);

        try {
            FileSystem.writeFileSync(Utils.getPath('htdocs', 'licenses', 'packages.json'), JSON.stringify(licenses, null, 4));
        } catch(error) {
            /* Do Nothing */
        }
    }

    resolveVersion(name, version) {
        const key = `node_modules/${name}`;

        if(this.Locking.packages[key]) {
            let module = this.Locking.packages[key];

            if(module.version) {
                return module.version;
            }
        }

        // Not found!
        return 'latest';
    }

    async fetching(name, version = null) {
        console.log('Fetching licenses for', name, version ?? 'latest');
        let result          = {};
        const response= await fetch(`https://registry.npmjs.org/${name}/${version}`);
        const json              = await response.json();

        if(json.version) {
            result.version = json.version;
        }

        if(json.license) {
            result.license = json.license;
        }

        if(json.homepage) {
            result.website = json.homepage;
        }

        return result;
    }
}());