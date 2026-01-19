/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
import {
    nativeImage as NativeImage
} from 'electron';
import Utils, { System } from './Utils.js';

export default (new class ElectronUtils {
    getIcon(name, rawPath = false) {
        const path = Utils.getOSIcon(name);

        if(rawPath) {
            return path;
        }

        return NativeImage.createFromPath(path).resize({ width: 16, height: 16 });
    }
});