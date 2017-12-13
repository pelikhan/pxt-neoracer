// tests go here; this will not be compiled when this package is used as a library
{
    const strip = neopixel.create(DigitalPin.P0, 60, NeoPixelMode.RGB);
    const track = neoracer.createTrack(strip);
    track.addSections([
        { length: 5, shape: SectionShape.Straight },
        { length: 10, shape: SectionShape.Overpass },
        { length: 5, shape: SectionShape.Straight },
        { length: 10, shape: SectionShape.LeftTurn },
        { length: 10, shape: SectionShape.Straight },
        { length: 5, shape: SectionShape.Overpass },
        { length: 10, shape: SectionShape.Straight },
        { length: 5, shape: SectionShape.RightTurn }
    ])
    track.show();

    const engine = neoracer.createEngine(track);
    engine.start();
}