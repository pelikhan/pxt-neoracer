enum CarState {
    None,
    Joined,
    Run,
    Turbo,
    Crashing,
    Finished
}

namespace neoracer {
    /**
     * A virtual car racing down the track
     */
    export class Car {
        public deviceId: number;
        public usePins: boolean;

        public turbo: boolean;
        public steering: number;
        public offset: number;
        public color: number;
        public state: CarState;
        public time: number;

        public deserialize(state: number) {
            this.turbo = !!(state & 0xff);
            this.steering = (state >> 8) & 0xff;
        }

        /**
         * Sends the car state over radio
         */
        public serialize(): number {
            const state = ((this.steering & 0xff) << 8) | (this.turbo ? 1 : 0);
            return state;
        }

        public render(strip: neopixel.Strip) {
            const head = 2;
            const trail = 2;
            const n = head + trail;
            const l = strip.length();
            const stateColors = [
                0,
                0x404000,
                0x000000,
                0xf00000,
                0x0f0f0f
            ]
            const col = stateColors[this.state] | this.color;

            for (let i = 0; i < head; ++i) {
                const o = (this.offset + n - i) % l;
                strip.setPixelColor(o, col);
            }
            for (let i = 0; i < trail; ++i) {
                const o = (this.offset + n - head - i) % l;
                const c = col;
                strip.setPixelColor(o, c);
            }
        }

        public setState(state: CarState) {
            this.state = state;
            if (this.state == CarState.None) return;

            let msg: string;
            switch (this.state) {
                case CarState.Run: msg = "run"; break;
                case CarState.Turbo: msg = "turbo"; break;
                case CarState.Crashing: msg = "crashing"; break;
                case CarState.Finished: msg = "finished"; break;
                case CarState.Joined: msg = "joined"; break;
            }
            if (this.deviceId) // builtin car id is 0, don't send message
                radio.sendValue(msg, this.deviceId);
        }

        public receivePacket(packet: radio.Packet) {
            const msg = packet.receivedString;
            const did = packet.receivedNumber;
            if (did != this.deviceId || !msg) return; // not for me
            switch (msg) {
                case "run":
                    this.state = CarState.Run;
                    led.toggle(0, 0); music.playTone(400, 50);
                    break;
                case "turbo":
                    this.state = CarState.Turbo;
                    led.toggle(1, 1); music.playTone(600, 50);
                    break;
                case "crashing":
                    this.state = CarState.Crashing;
                    led.toggle(2, 2); music.playTone(800, 100);
                    break;
                case "joined":
                    this.state = CarState.Joined;
                    music.playTone(400, 200);
                    music.playTone(600, 400);
                    basic.showLeds(`
. . . . .
. . . . #
. . . # .
# . # . .
. # . . .`)
                    break;
                default:
                    // ignore    
                    break;
            }
        }

        public updateState() {
            if (this.usePins) {
                this.steering = pins.map(pins.analogReadPin(AnalogPin.P1), 0, 1023, -4, 4);
                this.turbo = input.pinIsPressed(TouchPin.P2);
            } else {
                this.steering = pins.map(input.acceleration(Dimension.X), -1023, 1023, -4, 4);
                this.turbo = input.buttonIsPressed(Button.A);
            }
        }

        public sendState() {
            radio.sendValue("state", this.serialize());
        }
    }

}