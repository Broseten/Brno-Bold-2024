import p5, { Vector } from "p5";

export class Sphere {
   size: number = 0;
   position: Vector;
   direction: Vector;
   private alpha = 0;

   constructor(
      public p: p5,
      public sizeRange: Vector,
      public startPosition: Vector,
      public moveSpeed: number,
      public rotationSpeed: number,
      public sizeChangeSpeed: number
   ) {
      this.position = startPosition.copy();
      this.direction = Vector.random2D();
   }

   public update(flowVec: p5.Vector) {
      const p = this.p;

      // Update size oscillation
      const sizeOsc = Math.sin(p.millis() * this.sizeChangeSpeed * 0.001);
      this.size = p.map(sizeOsc, -1, 1, this.sizeRange.x, this.sizeRange.y);

      // affect visibility
      if (this.alpha < 1) {
         // make the spheres flicker when noone's around
         // flicker only sometime (0.5 chance that nothing will happen)
         this.alpha += p.map(p.random(), 0.5, 1, 0, 40);
         // decrease slower
         this.alpha *= 0.99;
      } else {
         // decrease faster
         this.alpha *= 0.8;
      }
      // add movement to the alpha
      this.alpha += flowVec.magSq() * 2.5;

      // add the flow to the direction
      // if (flowVec.magSq() > 10) this.direction.add(flowVec.copy().mult(0.1)).normalize();
      let speed = this.moveSpeed;
      // affect the speed by the flow
      speed *= Math.max(flowVec.magSq() / 4, 1);
      // Move sphere
      const velocity = this.direction.copy().mult(speed);
      this.position.add(velocity);

      // Wrap around edges (hide behind offset to prevent popping)
      const offset = this.size + 5;
      if (this.position.x + offset < 0) this.position.x = p.width + offset;
      if (this.position.x - offset > p.width) this.position.x = - offset;
      if (this.position.y + offset < 0) this.position.y = p.height + offset;
      if (this.position.y - offset > p.height) this.position.y = - offset;
   }

   public draw() {
      const p = this.p;

      p.push();
      p.noFill();
      p.stroke(255, this.alpha);

      // Translate to the sphere's position
      // TODO set sphere z to avoid hiding half of it behind the black background?
      p.translate(this.position.x - p.width / 2, this.position.y - p.height / 2);

      // Rotate around Z-axis for simple 2D effect
      p.rotateZ(this.p.frameCount * this.rotationSpeed);

      // Draw sphere
      p.sphere(this.size);

      p.pop();
   }

   // Check for collision and bounce off other spheres
   public collide(other: Sphere) {
      const distance = this.position.dist(other.position);
      const minDistance = this.size + other.size; // Assuming size represents diameter

      if (distance < minDistance) {
         // Calculate collision normal
         const collisionNormal = p5.Vector.sub(this.position, other.position).normalize();

         // Reflect this sphere's velocity across the collision normal
         this.direction.sub(
            collisionNormal.copy().mult(2 * this.direction.dot(collisionNormal))
         ).normalize();

         // Reflect the other sphere's velocity across the collision normal
         other.direction.sub(
            collisionNormal.copy().mult(2 * other.direction.dot(collisionNormal))
         ).normalize();

         // Separate spheres slightly to prevent overlap
         const overlap = minDistance - distance;
         const separation = collisionNormal.copy().mult(overlap / 2);
         this.position.add(separation);
         other.position.sub(separation);
      }
   }

}
