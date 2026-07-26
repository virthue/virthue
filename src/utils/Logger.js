/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import Chalk from 'chalk';
import {template} from 'chalk-template';
import StackTrace from 'stacktrace-js';
import { appendFile } from 'node:fs/promises';
import Path from 'node:path';

class Logger {
    Path = null;

    info(...args) {
        this.__display('info', ...args);
    }

    warn(...args) {
        this.__display('warn', ...args);
    }

    error(...args) {
        this.__display('error', ...args);
    }

    debug(...args) {
        this.__display('debug', ...args);
    }

    log(...args) {
        this.__display('log', ...args);
    }

    setPath(path) {
        this.Path = path;
    }

    __anonymize(obj) {
        if(typeof obj !== 'object' || obj === null) {
            return obj;
        }

        if(Array.isArray(obj)) {
            return obj.map(item => this.__anonymize(item));
        }

        return Object.entries(obj).reduce((result, [key, value]) => {
            if(key.toLowerCase() === 'password') {
                result[key] = '<#[SensitiveParameter]>';
            } else {
                result[key] = this.__anonymize(value);
            }

            return result;
        }, {});
    }

    async __display(...args) {
        let elements     = args.map(arg => this.__anonymize(arg));
        let output   = elements.shift();
        let type, color, target;

        switch(output) {
            case 'error':
                target  = '';
                type    = 'ERROR';
                color   = '#971616';
                break;
            case 'info':
                target  = '';
                type    = 'INFO';
                color   = '#244493';
                break;
            case 'warn':
                target  = '';
                type    = 'WARNING';
                color   = '#a88516';
                break;
            case 'log':
                target  = elements.shift();
                type    = 'LOG';
                color   = '#232325';
                break;
            case 'debug':
                target  = elements.shift();
                type    = 'DEBUG';
                color   = '#d16f07';
                break;
            default:
                target  = elements.shift();
                type    = 'LOG';
                color   = '#DEADED';
                break;
        }


        if(target.length >= 1) {
            elements.unshift(Chalk.hex(color)(`[${target}]`));
        }

        elements.unshift(Chalk.hex(color)(`[${type}]`));
        elements.unshift(Chalk.hex(color)('[' + new Date().toISOString() + ']'));

        if(type === 'DEBUG' || type === 'ERROR') {
            let trace = StackTrace.getSync();

            trace.shift();
            trace.shift();

            trace.forEach(entry => {
                elements.push('\n' + Chalk.hex('#3a250f')(entry.source));
            });
        }

        elements = elements.map(entry => {
            if(typeof entry !== 'string') {
                return entry;
            }

            let currentEntry = entry;

            try {
                const parsed = JSON.parse(currentEntry);

                if(typeof(parsed) === 'object' && parsed !== null) {
                    currentEntry = JSON.stringify(this.__anonymize(parsed));
                }
            } catch(e) {
                /* Do Nothing */
            }

            currentEntry = currentEntry.replaceAll('\\', '\\\\');

            try {
                currentEntry = template(currentEntry);
            } catch (e) {
                try {
                    if(typeof(JSON.parse(currentEntry)) === 'object') {
                        currentEntry = Chalk.hex('#444444')(currentEntry);
                    }
                } catch (e) {}
            }

            return currentEntry;
        });

        /* Only Display if not PM2 */
        if(!(!!process.env.PM2_HOME || !!process.env.pm_id || !!process.env.NODE_APP_INSTANCE)) {
            console[output].apply(console, elements);
        }

        if(this.Path !== null) {
            const date = new Date().toISOString().split('T')[0];
            elements.push("\n");
            await appendFile(Path.join(this.Path, 'Logs', `${date}.log`), elements.join(' '), 'utf8');
        }
    }
}

export default new Logger;