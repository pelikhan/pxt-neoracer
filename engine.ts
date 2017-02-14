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

namespace neoracer {
    /**
     * A race track game engine built for NeoPixel strips
     */
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
}