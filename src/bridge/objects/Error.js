/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */

import ErrorCode from './ErrorCode.js';

/**
 * Hue Bridge Error Response
 * @swagger
 * @schema Error
 * @ref type ErrorCode
 * @param {integer} type - Error type code
 * @param {string} address - Resource address that caused the error
 * @param {string} description - Detailed error description
 */
export default class HueError {
    type;
    address;
    description;

    /**
     * @param {number} type - Error type code from ErrorCode
     * @param {string} address - Resource address that caused the error
     * @param {string} description - Detailed error description
     */
    constructor(type, address, description) {
        this.type = type;
        this.address = address;
        this.description = description;
    }

    toJSON() {
        return {
            type: this.type,
            address: this.address,
            description: this.description
        };
    }
}

export { ErrorCode };
