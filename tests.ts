// tests go here; this will not be compiled when this package is used as a library
{
    const strip = neopixel.create(DigitalPin.P0, 300, NeoPixelMode.RGB);
    const track = neoracer.createTrack(strip);
    track.addSections([
        { length: 15, shape: SectionShape.Straight },
        { length: 8, shape: SectionShape.Overpass },
        { length: 19, shape: SectionShape.Straight },
        { length: 6, shape: SectionShape.Overpass },
        { length: 16, shape: SectionShape.Straight },
        { length: 9, shape: SectionShape.Overpass },
        { length: 6, shape: SectionShape.Straight },
        { length: 5, shape: SectionShape.LeftTurn },
        { length: 6, shape: SectionShape.Straight },
        { length: 4, shape: SectionShape.RightTurn },
        { length: 14, shape: SectionShape.Straight },
        { length: 9, shape: SectionShape.Overpass },
        { length: 9, shape: SectionShape.Straight },
        { length: 6, shape: SectionShape.Overpass },
        { length: 8, shape: SectionShape.Straight },
        { length: 7, shape: SectionShape.Overpass },
        { length: 14, shape: SectionShape.Straight },
        { length: 21, shape: SectionShape.Overpass },
        { length: 5, shape: SectionShape.Straight },
        { length: 8, shape: SectionShape.Overpass },
        { length: 8, shape: SectionShape.Straight },
        { length: 8, shape: SectionShape.Overpass },
        { length: 34, shape: SectionShape.Straight },
        { length: 6, shape: SectionShape.Overpass },
        { length: 5, shape: SectionShape.LeftTurn },
    ])
    track.show();
}