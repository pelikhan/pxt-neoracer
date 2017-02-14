enum SectionShape {
    Straight,
    LeftTurn = 1,
    RightTurn = 2,
    Overpass = 4
}

namespace neoracer {
    export interface ISection {
        length: number;
        shape: SectionShape;
    }

    /**
     * A section of a race track
     */
    //%
    export class Section {
        public range: neopixel.Strip;
        public shape: SectionShape;
        public color: number;

        /**
         * Gets a value indicating if the section contains the offset
         */
        //%
        public contains(offset: number): boolean {
            return this.range.start <= offset
                && this.range.start + this.range.length() < offset;
        }

        /**
         * Renders the car section
         */
        //%
        public render(): void {
            const n = this.range.length();
            for (let i = 0; i < n; ++i) {
                this.range.setPixelColor(i, this.color);
            }
        }

        /**
         * Moves the car according to the game rules
         */
        public move(car: Car): void {
            const crash = this.isCrashing(car);
            if (crash) {
                if (car.state == CarState.Crashing) {
                    car.offset += 1;
                    car.setState(CarState.Run);
                }
                else {
                    // don't move 1 turn during crash
                    car.setState(CarState.Crashing);
                }
            } else {
                car.offset += car.turbo ? 2 : 1;
                car.setState(car.turbo ? CarState.Turbo : CarState.Run);
            }
        }

        public isCrashing(car: Car): boolean {
            switch (this.shape) {
                case SectionShape.Overpass:
                    return car.turbo;
                case SectionShape.LeftTurn:
                    return car.steering > -2;
                case SectionShape.RightTurn:
                    return car.steering < 2;
                case SectionShape.Straight:
                default:
                    return Math.abs(car.steering) > 1;
            }
        }
    }
}