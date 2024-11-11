import p5, { Vector } from "p5";

export class Sphere {
   size: number = 0;
   position: Vector;
   direction: Vector;

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

   public update() {
      const p = this.p;

      // Update size oscillation
      this.size = p.map(Math.sin(p.millis() * this.sizeChangeSpeed * 0.001), -1, 1, this.sizeRange.x, this.sizeRange.y);

      // Move sphere
      const velocity = this.direction.copy().mult(this.moveSpeed);
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
      p.stroke(180);

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
