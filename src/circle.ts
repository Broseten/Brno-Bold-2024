import p5, { Vector } from "p5";

// Parameters
// TODO tweak constants
// TODO move to main file
// Determines how much circles are moved in the grid, affecting scaling as well
const SENSITIVITY = 1.8;
// Determines how quickly the offset shrinks each frame
const OFFSET_REDUCTION_SPEED = 0.8;
// Determines the ratio for circle size based on offset magnitude
const CIRCLE_SIZE_OFFSET_VECTOR_RATIO = 3;

export class Circle {
   // How much is it moved in the grid -- affects the scaling as well
   public offset: Vector = new Vector();

   // Position within the grid
   constructor(public position: Vector) { }

   public update(offset: Vector): void {
      // Sets how big the circles can actually get
      this.offset.add(offset.mult(SENSITIVITY));
      // Shrinks the offset every frame
      this.offset.mult(OFFSET_REDUCTION_SPEED);
   }

   public draw(b: p5.Graphics): void {
      // Draws the circle with an offset-based size
      (b as any).circle(
         this.position.x + this.offset.x,
         this.position.y + this.offset.y,
         this.offset.mag() / CIRCLE_SIZE_OFFSET_VECTOR_RATIO
      );
      // TODO: Add other cool effects based on offset if needed
   }
}
