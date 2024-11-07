import p5 from "p5";

// TODO can be something else and the grid can be then generic
export class Circle {
   // how much is it moved in the grid
   public offset: p5.Vector = new p5.Vector();

   constructor(public position: p5.Vector) { }

   public update (): void {
      // reduce the offset
      this.offset.mult(0.5);
   }

   public draw(b: p5.Graphics): void {
      (b as any).circle(this.position.x + this.offset.x, this.position.y + this.offset.y, this.offset.mag() / 3);
   }
}