enum GameControllerKind {
    AccelerometerButton,
    Pins
}

/**
 * A race track made of neopixels
 */
//% icon="\uf1b9" weight=90
namespace neoracer {
    /**
     * Creates an infinity loop track on top of the strip
    **/
    //% blockId=neoracer_start_infinityloop block="start infinity loop"
    export function startInfinityLoop(strip: neopixel.Strip, group: number = 0) {
        const track = createTrack(strip);
        const engine = createEngine(track, group);
        const n = strip.length();

        const straight = n / 6;
        const turn = n / 10;
        const overpass = (n - 4 * straight - 2 * turn) / 2;

        track.addSection(straight, SectionShape.Straight);
        track.addSection(overpass, SectionShape.Overpass);
        track.addSection(straight, SectionShape.Straight);
        track.addSection(turn, SectionShape.LeftTurn);
        track.addSection(straight, SectionShape.Straight);
        track.addSection(overpass, SectionShape.Overpass);
        track.addSection(straight, SectionShape.Straight);
        track.addSection(turn, SectionShape.RightTurn);

        if (group)
            radio.setGroup(group);    

        engine.start();
    }

    /**
     *  Starts a car controller 
     **/
    //% blockId=neoracer_start_remote_controller block="start controller %kind on group %group"
    export function startRemoteController(kind: GameControllerKind, group: number) {
        radio.setTransmitSerialNumber(true);
        radio.setTransmitPower(7);
        if (group)
            radio.setGroup(group);
        
        const car = new Car(control.deviceSerialNumber());
        car.usePins = kind == GameControllerKind.Pins;

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
            car.sendState();
            led.plot(Math.randomRange(0, 4), Math.randomRange(0, 4));
        })
    }

    /**
     * Starts a microbit as a sound system. Connect this microbit to a sound system.
     */
    //% blockId=neoracer_soundengine block="start sound engine"
    export function startSoundEngine(group: number = 42) {
        radio.setGroup(group);
        radio.onReceivedNumber(function (receivedNumber) {
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
