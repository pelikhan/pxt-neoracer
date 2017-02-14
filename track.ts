namespace neoracer {
    /**
     * A track built on top of neopixel sections
     */
    //%
    export class Track {
        public strip: neopixel.Strip;
        public sections: Section[];
        public cars: Car[];

        /**
         * Adds a section to the track. Section must be added in order
         */
        //% blockId=track_add_section block="add sections|length %length|shape %shape"
        public addSection(length: number, shape: SectionShape) {
            const s = new Section();
            let offset = 0;
            if (this.sections.length > 0) {
                const last = this.sections[this.sections.length - 1];
                offset = last.range.start + last.range.length();
            }
            s.shape = shape;
            s.range = this.strip.range(offset, Math.min(length, this.strip.length() - offset));
            s.color = 0x000400; // straight
            if ((shape & SectionShape.LeftTurn) || (shape & SectionShape.RightTurn))
                s.color = 0x040000; // turn
            else if (shape & SectionShape.Overpass)
                s.color = 0x000004; // overpass
            this.sections.push(s);
        }

        //%        
        public addSections(sections: ISection[]) {
            for (let i = 0; i < sections.length; ++i)
                this.addSection(sections[i].length, sections[i].shape);
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
                if (s.contains(offset)) {
                    return s;
                }
                if (offset < s.range.start)
                    r = Math.max(l, m - 1);
                else
                    l = Math.min(r, m + 1);
            } while (l != r);
            return this.sections[l];
        }

        /**
         * Gets a car instance from a device id.
         */
        public car(deviceId: number): Car {
            for (let i = 0; i < this.cars.length; ++i)
                if (this.cars[i].deviceId == deviceId) return this.cars[i];
            return null;
        }

        public addCar(deviceId: number): Car {
            if (this.car(deviceId)) return; // already added


            const carColors = [
                NeoPixelColors.Blue,
                NeoPixelColors.Yellow,
                NeoPixelColors.Violet,
                NeoPixelColors.Indigo,
                NeoPixelColors.Orange
            ];

            const c = new Car();
            c.deviceId = deviceId;
            c.color = carColors[this.cars.length % carColors.length];
            this.cars.push(c)

            c.setState(CarState.Joined);
            return c;
        }

        /**
         * Renders the current state of the track
         */
        public show() {
            this.strip.clear();
            for (let i = 0; i < this.sections.length; ++i)
                this.sections[i].render();
            for (let i = 0; i < this.cars.length; ++i)
                this.cars[i].render(this.strip);
            this.strip.show();
        }
    }

    /** 
     * Creates a new pixel track on top of the NeoPixel strip 
     */
    //% blockId=neoracer_create_track block="create track %strip"
    export function createTrack(strip: neopixel.Strip): Track {
        const track = new Track();
        track.strip = strip;
        track.strip.setBrigthness(255); // handled internally
        track.sections = [];
        track.cars = [];
        return track;
    }
}