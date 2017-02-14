enum CarState {
    None = 0x000000,
    Joined = 0x0f000f,
    Run = 0x010101,
    Turbo = 0x0c0c00,
    Crashing = 0x0000ff,
    Finished = 0x0f0f0f
}

namespace neoracer {
    /**
     * A virtual car racing down the track
     */
    export class Car {
        public deviceId: number;
        public turbo: boolean;
        public steering: int8;

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
            const col = this.state == CarState.Crashing ? 0xFF0000 : this.color;

            for (let i = 0; i < head; ++i) {
                const o = (this.offset + n - i) % l;
                strip.setPixelColor(o, col);
            }
            for (let i = 0; i < trail; ++i) {
                const o = (this.offset + n - head - i) % l;
                const c = col / (i * 4 + 2);
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
            if (this.deviceId)
                radio.sendValue(msg, this.deviceId);
        }

        public receivePacket(packet: radio.Packet) {
            const msg = packet.receivedString;
            const did = packet.receivedNumber;
            if (did != this.deviceId || !msg) return; // not for me
            switch (msg) {
                case "crash": led.toggle(2, 2); music.playTone(800, 100); break;
                case "turbo": led.toggle(2, 2); music.playTone(600, 50); break;
                case "run": led.toggle(2, 2); music.playTone(400, 50); break;
                case "joined":
                    basic.showLeds(
                        `
. . . . .
. . . . #
. . . # .
# . # . .
. # . . .`)
                    break;
                default:
                    basic.showString(msg);
                    break;
            }
        }

        public updateState() {
            this.steering = pins.map(input.acceleration(Dimension.X), -1023, 1023, -4, 4);
            this.turbo = input.buttonIsPressed(Button.A);
            if (this.deviceId)
                radio.sendValue("state", this.serialize());
        }

        public updatePinState() {
            this.steering = pins.map(pins.analogReadPin(AnalogPin.P1), 0, 1023, -4, 4);
            this.turbo = input.pinIsPressed(TouchPin.P2);
        }
    }

}