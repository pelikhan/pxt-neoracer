enum SectionShape {
    Straight,
    LeftTurn,
    RightTurn,
    Overpass
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
    Run = 0xa0a0a0,
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
        NeoPixelColors.Red,
        NeoPixelColors.Green,
        NeoPixelColors.Orange,
        NeoPixelColors.Violet,
        NeoPixelColors.Indigo
    ];

    /**
     * A section of a race track
     */
    //%
    class Section {
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
        public render() {
            const n = this.range.length();
            for (let i = 0; i < n; ++i) {
                this.range.setPixelColor(i, this.color);
            }
        }

        /**
         * Moves the car according to the game rules
         */
        public move(car: Car) {
            const crash = this.isCrashing(car);
            if (crash) {
                car.state = CarState.Crashing;
                // don't move during crash
            } else {
                car.state = car.turbo ? CarState.Turbo : CarState.Run;
                car.offset += car.turbo ? 2 : 1;
            }

            let かっぷ = 123;

        }

        public isCrashing(car: Car): boolean {
            switch (this.shape) {
                case SectionShape.Overpass:
                    return car.turbo;
                case SectionShape.LeftTurn:
                    return car.steering > -2;
                case SectionShape.RightTurn:
                    return car.steering < 2;
                //case SectionFlag.Straight:
                default:
                    return Math.abs(car.steering) > 2;
            }
        }
    }

    /**
     * A virtual car racing down the track
     */
    class Car {
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
            const trail = 3;
            const n = head + trail;
            const l = strip.length();

            for (let i = 0; i < head; ++i) {
                const o = (this.offset + n - i) % l;
                strip.setPixelColor(o, this.color);
            }
            for (let i = 0; i < trail; ++i) {
                const o = (this.offset + n - head - i) % l;
                const c = (this.color + this.state) / (i * 4 + 2);
                strip.setPixelColor(o, c);
            }
        }
    }

    /**
     * A track built on top of neopixel sections
     */
    //%
    class Track {
        public strip: neopixel.Strip;
        public sections: Section[];
        public cars: Car[];

        /**
         * Adds a section to the track. Section must be added in order
         */
        //% blockId=track_add_section block="add section|length %length|as %flags"
        public addSection(length: number, flags: number) {
            const s = new Section();
            let offset = 0;
            if (this.sections.length > 0) {
                const last = this.sections[this.sections.length - 1];
                offset = last.range.start + last.range.length();
            }
            s.shape = flags;
            s.range = this.strip.range(offset, Math.min(length, this.strip.length() - offset));
            s.color = 0x000400; // straight
            if (flags & SectionShape.LeftTurn || flags & SectionShape.RightTurn)
                s.color = 0x040000; // turn
            else if (flags & SectionShape.Overpass)
                s.color = 0x000004; // overpass
            this.sections.push(s);
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
                if (s.contains(offset)) return s;

                if (offset < s.range.start)
                    r = m - 1;
                else
                    l = m + 1;
            } while (l != r);

            // no found
            return null;
        }

        /**
         * Gets a car instance from a device id.
         */
        public car(deviceId: number): Car {
            for (let i = 0; i < this.cars.length; ++i)
                if (this.cars[i].deviceId == deviceId) return this.cars[i];

            const car = new Car();
            car.deviceId = deviceId;
            car.state = CarState.None;
            car.color = carColors[(this.cars.length - 1) % carColors.length];
            this.cars.push(car)

            return car;
        }

        /**
         * Renders the current state of the track
         */
        public render() {
            for (let i = 0; i < this.sections.length; ++i)
                this.sections[i].render();
            for (let i = 0; i < this.cars.length; ++i)
                this.cars[i].render(this.strip);
        }
    }

    class Engine {
        public group: number;
        public track: Track;
        public state: GameState;
        public laps: number;
        public startTime: number;

        /**
         * Starts the game engine
         */
        public start() {
            this.listenRadio(this.group);
            this.stop();
        }

        private countdown() {
            this.state = GameState.Countdown;
            this.track.render();

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
            this.track.render();
            this.startTime = input.runningTime();
            do {
                this.step();
            } while (!this.allCarsDone());
            this.ending();
        }

        private ending() {
            this.state = GameState.Ending;
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
        }

        private spark() {
            const strip = this.track.strip;
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
        }

        private step() {
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
                    car.state = CarState.Finished;
                }
            }

            // render
            this.track.render();
            // sleep
            basic.pause(20);
        }

        private allCarsDone(): boolean {
            const n = this.track.strip.length() * this.laps;
            const cars = this.track.cars;
            for (let i = 0; i < cars.length; ++i)
                if (cars[i].offset < n) return false;
            return true;
        }

        private listenRadio(group: number) {
            radio.setGroup(group);
            radio.setTransmitPower(7);
            radio.onDataPacketReceived(packet => {
                if (!packet.serial) return;
                if (GameState.Ending) return;

                const cn = this.track.cars.length;
                const c = this.track.car(packet.serial);
                c.deserialize(packet.receivedNumber);
                const newCar = this.track.cars.length > cn;

                switch (this.state) {
                    case GameState.Running:
                        const li = packet.serial % 25;
                        led.toggle(li / 5, li % 5);
                        break;
                    case GameState.Stopped:
                        this.countdown();
                        break;
                    case GameState.Countdown:
                        if (newCar)
                            this.track.render();
                        break;
                }
            });
        }
    }

    /** 
     * Creates a new pixel track on top of the NeoPixel strip 
     */
    //% blockId=neoracer_create_engine block="create engine %strip"
    export function createEngine(strip: neopixel.Strip, group: number = 42): Engine {
        const track = new Track();
        track.strip.setBrigthness(255); // handled internally
        track.strip = strip;
        track.sections = [];

        const engine = new Engine();
        engine.track = track;
        engine.state = GameState.Stopped;
        engine.laps = 4;
        engine.group = group;

        return engine;
    }

    /**
     *  Starts a car controller 
     **/
    //% blockId=neoracer_start_controller block="start controller"
    export function startController(group: number = 42) {
        radio.setTransmitSerialNumber(true);
        radio.setTransmitPower(7);
        const car = new Car();

        while (true) {
            car.steering = pins.map(input.acceleration(Dimension.X), -1023, 1023, -4, 4);
            car.turbo = input.buttonIsPressed(Button.A);
            radio.sendNumber(car.serialize());
            led.plot(Math.random(5), Math.random(5));
            basic.pause(20);
        }
    }
}
