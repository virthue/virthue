/**
 * virthue - Virtual Philips Hue Bridge
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */
/*
* Represents the large link button on the front of the Hue Bridge.
*/
export default class LinkButton {
    Bridge         = null;
    Pressed     = false;
    Timeout     = 30000;
    Timer          = null;

    constructor(bridge) {
        this.Bridge = bridge;
    }

    /*
    * Returns the current status indicating whether the button has been pressed.
    */
    getState() {
        return this.Pressed;
    }

    /*
    * Activates the button: The button is now pressed.
    * Sends the event `LINK_BUTTON_CHANGED` with their state  to the bridge instance.
    */
    activate() {
        this.Pressed = true;
        this.#start();
        this.Bridge.emit('LINK_BUTTON_CHANGED', this.Pressed);
    }

    /*
    * Disables the button prematurely.
    * Sends the event `LINK_BUTTON_CHANGED` with their state to the bridge instance.
    */
    deactivate() {
        this.#stop();
        this.Pressed = false;
        this.Bridge.emit('LINK_BUTTON_CHANGED', this.Pressed);
    }

    /*
    * Starts the internal timer for how long the button is reported as “actively pressed.”
    */
    #start() {
        this.#stop();

        this.Timer = setTimeout(() => {
            this.deactivate();
        }, this.Timeout);
    }

    /*
    * Stops the internal timer prematurely.
    */
    #stop() {
        if(this.Timer) {
            clearTimeout(this.Timer);
        }
    }
}