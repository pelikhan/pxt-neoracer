
enum SoundMessage {
    None = 0,
    Run = 400,
    Turbo = 500,
    Crash = 800,
    Countdown = 600,
    Start = 700
}

/**
 * A race track made of neopixels
 */
namespace neoracer {
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
