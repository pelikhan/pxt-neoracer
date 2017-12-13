// tests go here; this will not be compiled when this package is used as a library
{
    const strip = neopixel.create(DigitalPin.P0, 60, NeoPixelMode.RGB);
    neoracer.startInfinityLoop(strip, 12);
}