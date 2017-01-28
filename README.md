# NeoRacer

A library to play racing games on NeoPixel strips

## Racing on Neopixel strips?

### The track

The cars are represented by a sequence of colored pixels and move around the track. The track is composed of sections of various
shapes.

The section shapes are:

* straight: turbo, no turn
* overpass: no turbo, turn allowed
* turn left/right: turbo, turn required

If any of the rules is violated, the car goes into crashing mode
and does not move for a turn. If the move is allowed and turbo is enabled,
the car move twice.

### The Players

Cars enter the game by running the controller app remotely. Information is transferred via radio to allow wireless control. 
An infinite amount of users or until the micro:bit runs out of memory is possible by overlapping the rendering of cars.

As the car moves around the track, state information is reported back to the controller to allow for vibration or display on the screen.

### Game

The game countdown is started when a controller presses A or B. 
Other players can join the game during the countdown by pressing A or B as well. They cannot register during the race.

After countdown, the race is on until a player finishes the race. At which point, the ending sequence starts and the track goes back to idle more.

## Controls

## Supported targets

* for PXT/ microbit

## License

MIT