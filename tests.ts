// tests go here; this will not be compiled when this package is used as a library
{
    const strip = neopixel.create(DigitalPin.P0, 150, NeoPixelMode.RGB_RGB);
    const engine = neoracer.createEngine(strip);
    const track = engine.track;

    track.addSection(30, SectionShape.Straight); // 30
    track.addSection(10, SectionShape.Overpass); // 40
    track.addSection(30, SectionShape.Straight); // 70
    track.addSection(10, SectionShape.LeftTurn); // 80
    track.addSection(30, SectionShape.Straight); // 110
    track.addSection(10, SectionShape.Overpass); // 120
    track.addSection(20, SectionShape.Straight); // 140
    track.addSection(10, SectionShape.RightTurn); // 150

    neoracer.startController();

    engine.start();
}