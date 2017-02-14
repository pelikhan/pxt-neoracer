enum SectionShape {
    Straight,
    LeftTurn = 1,
    RightTurn = 2,
    Overpass = 4
}

enum GameState {
    Stopped,
    Running,
    Countdown,
    Ending
}

enum SoundMessage {
    None = 0,
    Run = 400,
    Turbo = 500,
    Crash = 800,
    Countdown = 600,
    Start = 700
}

enum CarState {
    None = 0x000000,
    Joined = 0x0f000f,
    Run = 0x010101,
    Turbo = 0x0c0c00,
    Crashing = 0x0000ff,
    Finished = 0x0f0f0f
}

/**
 * A race track made of neopixels
 */
namespace neoracer {
    const carColors = [
        NeoPixelColors.Blue,
        NeoPixelColors.Yellow,
        NeoPixelColors.Violet,
        NeoPixelColors.Indigo,
        NeoPixelColors.Orange
    ];

    export interface ISection {
        length: number;
        shape: SectionShape;
    }

    /**
     * A section of a race track
     */
    //%
    export class Section {
        public range: neopixel.Strip;
        public shape: SectionShape;
        public color: number;

        /**
         * Gets a value indicating if the section contains the offset
         */
        //%
        public contains(offset: number): boolean {
            return this.range.start <= offset
                && this.range.start + this.range.length() < offset;
        }

        /**
         * Renders the car section
         */
        //%
        public render(): void {
            const n = this.range.length();
            for (let i = 0; i < n; ++i) {
                this.range.setPixelColor(i, this.color);
            }
        }

        /**
         * Moves the car according to the game rules
         */
        public move(car: Car): void {
            const crash = this.isCrashing(car);
            if (crash) {
                if (car.state == CarState.Crashing) {
                    car.offset += 1;
                    car.setState(CarState.Run);
                }
                else {
                    // don't move 1 turn during crash
                    car.setState(CarState.Crashing);
                }
            } else {
                car.offset += car.turbo ? 2 : 1;
                car.setState(car.turbo ? CarState.Turbo : CarState.Run);
            }
        }

        public isCrashing(car: Car): boolean {
            switch (this.shape) {
                case SectionShape.Overpass:
                    return car.turbo;
                case SectionShape.LeftTurn:
                    return car.steering > -2;
                case SectionShape.RightTurn:
                    return car.steering < 2;
                default:
                    return Math.abs(car.steering) > 1;
            }
        }
    }

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

    /**
     * A track built on top of neopixel sections
     */
    //%
    export class Track {
        public strip: neopixel.Strip;
        public sections: Section[];
        public cars: Car[];

        /**
         * Adds a section to the track. Section must be added in order
         */
        //% blockId=track_add_section block="add sections|length %length|shape %shape"
        public addSection(length: number, shape: SectionShape) {
            const s = new Section();
            let offset = 0;
            if (this.sections.length > 0) {
                const last = this.sections[this.sections.length - 1];
                offset = last.range.start + last.range.length();
            }
            s.shape = shape;
            s.range = this.strip.range(offset, Math.min(length, this.strip.length() - offset));
            s.color = 0x000400; // straight
            if ((shape & SectionShape.LeftTurn) || (shape & SectionShape.RightTurn))
                s.color = 0x040000; // turn
            else if (shape & SectionShape.Overpass)
                s.color = 0x000004; // overpass
            this.sections.push(s);
        }

        //%        
        public addSections(sections: ISection[]) {
            for (let i = 0; i < sections.length; ++i)
                this.addSection(sections[i].length, sections[i].shape);
        }

        /**
         * Find the section that covers a given offset
         */
        public sectionFromOffset(offset: number): Section {
            let l = 0;
            let r = this.sections.length - 1;
            do {
                const m = l + (r - l) / 2;
                const s = this.sections[m];
                if (s.contains(offset)) {
                    return s;
                }
                if (offset < s.range.start)
                    r = Math.max(l, m - 1);
                else
                    l = Math.min(r, m + 1);
            } while (l != r);
            return this.sections[l];
        }

        /**
         * Gets a car instance from a device id.
         */
        public car(deviceId: number): Car {
            for (let i = 0; i < this.cars.length; ++i)
                if (this.cars[i].deviceId == deviceId) return this.cars[i];
            return null;
        }

        public addCar(deviceId: number): Car {
            if (this.car(deviceId)) return; // already added

            const c = new Car();
            c.deviceId = deviceId;
            c.color = carColors[this.cars.length % carColors.length];
            this.cars.push(c)

            c.setState(CarState.Joined);
            return c;
        }

        /**
         * Renders the current state of the track
         */
        public show() {
            this.strip.clear();
            for (let i = 0; i < this.sections.length; ++i)
                this.sections[i].render();
            for (let i = 0; i < this.cars.length; ++i)
                this.cars[i].render(this.strip);
            this.strip.show();
        }
    }

    export class Engine {
        public group: number;
        public track: Track;
        public state: GameState;
        public laps: number;
        public startTime: number;

        /**
         * Starts the game engine
         */
        //% blockId=neoracer_engine_start block="%this|start"
        public start() {
            this.listenPins();
            this.listenRadio(this.group);
            this.stop();
        }

        private countdown() {
            this.state = GameState.Countdown;
            this.track.strip.clear();
            this.track.strip.show();
            basic.pause(1000);
            this.track.show();
            basic.clearScreen();
            for (let i = 0; i < 3; ++i) {
                basic.showNumber(3 - i, 0);
                this.playTone(SoundMessage.Countdown, 500);
            }
            led.plotAll();
            this.run();
        }

        private playTone(pitch: number, duration: number) {
            music.playTone(pitch, duration);
        }

        private run() {
            this.state = GameState.Running;
            this.track.show();
            this.startTime = input.runningTime();
            do {
                this.step();
            } while (!this.anyCarDone());
            this.ending();
        }

        private ending() {
            this.state = GameState.Ending;
            basic.showLeds(
                `# . # . #
  . # . # .
  # . # . #
  . # . # .
  # . # . #`)
            this.spark();
            // send results
            this.track.cars = [];
            this.stop();
        }

        private stop() {
            this.state = GameState.Stopped;
            basic.clearScreen();
            basic.showLeds(
                `# # # # #
 # . . . #
 # . . . #
 # . . . #
 # # # # #`)
            // wait for players to play
            this.track.show();
        }

        private spark() {
            const strip = this.track.strip;
            const n = strip.length();
            strip.clear()
            for (let m = 0; m < 50; m++) {
                const l = Math.random(n)
                strip.setPixelColor(l, NeoPixelColors.White)
                strip.show()
                basic.pause(90)
                strip.clear()
                strip.show()
                basic.pause(20);
            }
            strip.clear();
            strip.show();
        }

        private step() {
            serial.writeLine("step");
            const n = this.track.strip.length() * this.laps;

            const cars = this.track.cars;
            for (let i = 0; i < cars.length; ++i) {
                const car = cars[i];
                // this car is done?
                if (car.state == CarState.Finished) break;

                // move the car
                const section = this.track.sectionFromOffset(car.offset);
                section.move(car);

                // are we done?
                if (car.offset >= n) {
                    car.time = input.runningTime() - this.startTime;
                    car.setState(CarState.Finished);
                }
            }

            // render
            this.track.show();
            // sleep
            basic.pause(20);
        }

        private anyCarDone(): boolean {
            const n = this.track.strip.length() * this.laps;
            const cars = this.track.cars;
            for (let i = 0; i < cars.length; ++i)
                if (cars[i].offset >= n) {
                    return true;
                }
            return false;
        }

        private listenPins() {
            input.onPinPressed(TouchPin.P2, () => {
                if (this.state == GameState.Stopped) {
                    this.countdown();
                }
            })
            input.onButtonPressed(Button.A, () => {
                if (this.state == GameState.Stopped) {
                    this.track.addCar(0);
                    this.countdown();
                }
            });
        }

        private listenRadio(group: number) {
            radio.setGroup(group);
            radio.setTransmitPower(7);
            radio.onDataPacketReceived(packet => {
                const msg = packet.receivedString
                const serial = packet.serial;

                if (!serial || !msg) return;
                if (GameState.Ending) return;

                switch (msg) {
                    case "A":
                    case "B":
                        if (GameState.Stopped) {
                            this.countdown();
                        } else if (GameState.Countdown) {
                            const c = this.track.addCar(packet.serial);
                            c.deserialize(packet.receivedNumber);
                            this.track.show();
                        }
                        break;
                    case "state":
                        if (!GameState.Running) break;

                        const c = this.track.car(packet.serial);
                        if (!c) return;

                        c.deserialize(packet.receivedNumber);
                        const li = packet.serial % 25;
                        led.toggle(li / 5, li % 5);
                        break;
                }
            });
        }
    }

    /** 
     * Creates a new pixel track on top of the NeoPixel strip 
     */
    //% blockId=neoracer_create_track block="create track %strip"
    export function createTrack(strip: neopixel.Strip): Track {
        const track = new Track();
        track.strip = strip;
        track.strip.setBrigthness(255); // handled internally
        track.sections = [];
        track.cars = [];
        return track;
    }

    /** 
     * Creates a new pixel track on top of the NeoPixel strip 
     */
    //% blockId=neoracer_create_engine block="create engine %track=neoracer_create_track"
    export function createEngine(track: Track, group: number = 42): Engine {
        const engine = new Engine();
        engine.track = track;
        engine.state = GameState.Stopped;
        engine.laps = 4;
        engine.group = group;
        engine.startTime = 0;

        return engine;
    }

    /**
     * Creates an infinity loop track on top of the strip
    **/
    //% blockId=neoracer_start_infinityloop block="start infinity loop"
    export function startInfinityLoop(strip: neopixel.Strip, group: number = 42) {
        const track = createTrack(strip);
        const engine = createEngine(track, group);
        const n = strip.length();

        const straight = n / 5;
        const turn = (n - 4 * straight) / 4;
        let correction = n - 4 * straight - 4 * turn;
        const overpass = turn + correction / 2;
        correction = n - 2 * turn - 2 * overpass;

        track.addSection(straight + correction, SectionShape.Straight);
        track.addSection(overpass, SectionShape.Overpass);
        track.addSection(straight, SectionShape.Straight);
        track.addSection(turn, SectionShape.LeftTurn);
        track.addSection(straight, SectionShape.Straight);
        track.addSection(overpass, SectionShape.Overpass);
        track.addSection(straight, SectionShape.Straight);
        track.addSection(turn, SectionShape.RightTurn);

        engine.start();
    }

    /**
     *  Starts a car controller 
     **/
    //% blockId=neoracer_start_remote_controller block="start controller"
    export function startRemoteController(group: number = 42) {
        radio.setTransmitSerialNumber(true);
        radio.setTransmitPower(7);
        radio.setGroup(42);
        const car = new Car();
        car.deviceId = control.deviceSerialNumber();

        input.onButtonPressed(Button.A, () => {
            radio.sendString("A");
        })
        input.onButtonPressed(Button.A, () => {
            radio.sendString("B");
        })
        radio.onDataPacketReceived(packet => {
            car.receivePacket(packet);
        })
        basic.forever(() => {
            car.updateState();
            led.plot(Math.random(5), Math.random(5));
        })
    }

    /**
     * Starts a microbit as a sound system. Connect this microbit to a sound system.
     */
    //% blockId=neoracer_soundengine block="start sound engine"
    export function startSoundEngine(group: number = 42) {
        radio.setGroup(42);
        radio.onDataPacketReceived(({receivedNumber}) => {
            switch (receivedNumber) {
                case SoundMessage.Run:
                    led.toggle(0, 0);
                    music.playTone(400, 70);
                    break;
                case SoundMessage.Turbo:
                    led.toggle(1, 1)
                    music.playTone(800, 20);
                    break;
                case SoundMessage.Crash:
                    led.toggle(2, 2);
                    music.playTone(600, 100);
                    break;
                case SoundMessage.Countdown:
                    led.toggle(3, 3);
                    music.playTone(500, 700);
                    break;
            }
        })
    }
}
