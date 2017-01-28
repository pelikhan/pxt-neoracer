// tests go here; this will not be compiled when this package is used as a library
{
    const strip = neopixel.create(DigitalPin.P0, 150, NeoPixelMode.RGB_RGB);
    neoracer.infinityLoop(strip);
    neoracer.startController();
}