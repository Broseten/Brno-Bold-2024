import p5, { Vector } from "p5";

export class Circle {
   // how much is it moved in the grid -- affects the scaling as well
   public offset: Vector = new Vector();

   // position within the grid
   constructor(public position: Vector) { }

   public update(offset: Vector): void {
      // TODO tweak constant
      // sets how big the circles can actually get
      let sensitivity = 1.8;
      this.offset.add(offset.mult(sensitivity));
      // TODO tweak constant
      // grow the offset a bit smaller every frame
      let offsetReductionSpeed = 0.8;
      this.offset.mult(offsetReductionSpeed);
   }

   public draw(b: p5.Graphics): void {
      // TODO tweak constant?
      // similar to sensitivity in the update()
      let circleSizeOffsetVectorRatio = 3;
      // can draw something else if we want
      (b as any).circle(this.position.x + this.offset.x, this.position.y + this.offset.y, this.offset.mag() / circleSizeOffsetVectorRatio);
      // TODO here can happen something cool if we get certain offset etc.
   }
}