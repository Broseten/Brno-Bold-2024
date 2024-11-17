import p5, { Vector } from "p5";
import { Grid } from "./grid";

// Parameters
// TODO tweak constants
// TODO move to main file
// Determines how much circles are moved in the grid, affecting scaling as well
const SENSITIVITY = 1.8;
// Determines how quickly the offset shrinks each frame
const OFFSET_REDUCTION_SPEED = 0.8;
// Determines the circle/square size based on offset magnitude
const ELEMENT_SIZE_MULTIPLIER = 9;
const TEXT_SIZE_MULTIPLIER = 2.5;
const SQUARE_ROTATION_MULTIPLIER = 0.03;
const CIRCLESQUARE_ROTATION_MULTIPLIER = 0.006;

export enum GridCellMode {
   Circle,
   Square,
   RotatingSquare,
   Letter,
   SquareCircle,
   SquareSquare,
   SquareSquareInverse,
   // None
}
let nextLetterIndex = 0

export class GridCell {
   // How much is it moved in the grid -- affects the scaling as well
   // Max is around 160 magnitude (probably depends on the screensize) and bellow 10 is noise
   public offset: Vector = new Vector();
   private letter: string;

   // Position within the grid
   constructor(public grid: Grid, public position: Vector) {
      const text = 'BOLD';
      // const randomLetterIndex = this.grid.p.floor(this.grid.p.random(letters.length));
      const letters = Array.from(text).reverse()
      this.letter = letters[nextLetterIndex];
      // due to the mirroring we have to reverse the order
      nextLetterIndex = (nextLetterIndex + 1) % text.length;
   }

   public update(offset: Vector): void {
      // Sets how big the circles can actually get
      this.offset.add(offset.mult(SENSITIVITY));
      // Shrinks the offset every frame
      this.offset.mult(OFFSET_REDUCTION_SPEED);
   }

   public draw(mode: GridCellMode, backgroundColor: p5.Color, mainColor: p5.Color, canvas: p5.Graphics): void {
      (canvas as any).push();
      (canvas as any).translate(this.position.x, this.position.y);
      switch (mode) {
         case (GridCellMode.Circle):
            this.drawCircle(canvas, mainColor);
            break;
         case (GridCellMode.Square):
            this.drawSquare(canvas, mainColor);
            break;
         case (GridCellMode.Letter):
            this.drawLetter(canvas, mainColor);
            break;
         case (GridCellMode.SquareCircle):
            this.drawSquareCircle(canvas, backgroundColor, mainColor);
            break;
         case (GridCellMode.SquareSquare):
            this.drawSquareCircle(canvas, backgroundColor, mainColor, true);
            break;
         case (GridCellMode.SquareSquareInverse):
            this.drawSquareCircle(canvas, backgroundColor, mainColor, true, true);
            break;
         case (GridCellMode.RotatingSquare):
            this.drawSquare(canvas, mainColor, true);
            break;
         default:
            break;
      }
      (canvas as any).pop();
   }

   private drawSquareCircle(canvas: p5.Graphics, backgroundColor: p5.Color, mainColor: p5.Color, square = false, inverse = false) {
      (canvas as any).noStroke();
      (canvas as any).fill(mainColor);
      (canvas as any).rotate((canvas as any).random(0, this.offset.mag() * CIRCLESQUARE_ROTATION_MULTIPLIER));

      (canvas as any).rectMode(this.grid.p.CENTER);
      (canvas as any).square(0, 0, this.grid.gridCellSize * 0.9);

      if (square) {
         this.drawInnerSquare(canvas, backgroundColor, inverse);
      } else {
         this.drawInnerCircle(canvas, backgroundColor);
      }
   }

   private drawInnerSquare(canvas: p5.Graphics, color: p5.Color, inverse: boolean) {
      const size = this.offset.mag() / this.grid.gridCellSize * ELEMENT_SIZE_MULTIPLIER * 0.9;
      const finalSize = inverse ? this.grid.gridCellSize * 0.8 - size : size;
      (canvas as any).fill(color);
      (canvas as any).square(0, 0, finalSize);
   }

   private drawInnerCircle(canvas: p5.Graphics, color: p5.Color) {
      const innerCircleSize = this.offset.mag() / this.grid.gridCellSize * ELEMENT_SIZE_MULTIPLIER * 0.9;
      (canvas as any).fill(color);
      (canvas as any).circle(0, 0, innerCircleSize);
   }

   private drawLetter(canvas: p5.Graphics, color: p5.Color) {
      (canvas as any).noStroke();
      (canvas as any).fill(color);
      (canvas as any).translate(this.offset.x, this.offset.y);
      // -1 in x to prevent the mirroring
      const size = this.offset.mag() / this.grid.gridCellSize * TEXT_SIZE_MULTIPLIER;
      (canvas as any).scale(-1 * size, size);
      (canvas as any).textAlign(this.grid.p.CENTER, this.grid.p.CENTER);
      (canvas as any).text(this.letter, 0, 0);
   }

   private drawSquare(canvas: p5.Graphics, color: p5.Color, rotate = false) {
      (canvas as any).noStroke();
      (canvas as any).fill(color);
      (canvas as any).translate(this.offset.x, this.offset.y);
      if (rotate) {
         (canvas as any).rotate((canvas as any).random(0, this.offset.mag() * SQUARE_ROTATION_MULTIPLIER));
      }
      (canvas as any).square(0, 0, this.offset.mag() / this.grid.gridCellSize * ELEMENT_SIZE_MULTIPLIER);
   }

   private drawCircle(canvas: p5.Graphics, color: p5.Color) {
      (canvas as any).noStroke();
      (canvas as any).fill(color);
      // Draws the circle with an offset-based size
      (canvas as any).circle(
         this.offset.x,
         this.offset.y,
         this.offset.mag() / this.grid.gridCellSize * ELEMENT_SIZE_MULTIPLIER
      );
   }
}
