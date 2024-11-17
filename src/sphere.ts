import p5, { Vector } from "p5";

// TODO move to the other file and pass it or export it
// The maximum value by which the alpha (opacity) can increase during flickering.
const ALPHA_INCREASE_MAX = 120;
// The rate at which alpha decreases when there is minimal activity or flow.
const ALPHA_DECREASE_SLOW = 0.995;
// The rate at which alpha decreases when there is significant activity or flow.
const ALPHA_DECREASE_FAST = 0.8;
// Multiplier to scale the impact of flow vector magnitude on the alpha (opacity).
const ALPHA_FLOW_MULTIPLIER = 2.5;
// Multiplier to adjust the influence of the flow vector on the direction of the sphere.
// const DIRECTION_FLOW_MULTIPLIER = 0.1;
// Offset added to the sphere size when wrapping around the screen edges to prevent visual popping.
const EDGE_WRAP_OFFSET = 5;

const FLOW_SPEED_MULTIPLIER = 1;

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

   public update(spheresInverseAlpha: boolean, flowVec: p5.Vector, shouldBounce: boolean) {
      const p = this.p;

      // Update size oscillation
      const sizeOsc = Math.sin(p.millis() * this.sizeChangeSpeed * 0.001);
      this.size = p.map(sizeOsc, -1, 1, this.sizeRange.x, this.sizeRange.y);

      this.alpha = Math.min(Math.max(this.alpha, 0), 255);

      // Affect visibility
      if (this.alpha < 1) {
         // Make the spheres flicker when no one's around
         // Flicker only sometimes (0.52 chance that nothing will happen)
         this.alpha += p.map(p.random(), 0.52, 1, 0, ALPHA_INCREASE_MAX);
         // Decrease slower
         this.alpha *= ALPHA_DECREASE_SLOW;
      } else {
         if (spheresInverseAlpha) {
            this.alpha *= ALPHA_DECREASE_SLOW;
         } else {
            // Decrease faster
            this.alpha *= ALPHA_DECREASE_FAST;
         }
      }
      // Add movement to the alpha
      this.alpha += flowVec.magSq() * ALPHA_FLOW_MULTIPLIER;

      // Add the flow to the direction
      // if (flowVec.magSq() > 10) this.direction.add(flowVec.copy().mult(DIRECTION_FLOW_MULTIPLIER)).normalize();
      let speed = this.moveSpeed;
      // Affect the speed by the flow
      if (spheresInverseAlpha) {
         speed -= flowVec.mag() * FLOW_SPEED_MULTIPLIER;
         speed = Math.max(speed, 0);
      } else {
         speed += flowVec.mag() * FLOW_SPEED_MULTIPLIER;
      }
      // Move sphere
      const velocity = this.direction.copy().mult(speed);
      this.position.add(velocity);

      const offset = this.size + EDGE_WRAP_OFFSET;

      if (shouldBounce) {
         // Bounce off edges
         if (this.position.x - this.size < 0 || this.position.x + this.size > p.width) {
            this.direction.x *= -1;
         }
         if (this.position.y - this.size < 0 || this.position.y + this.size > p.height) {
            this.direction.y *= -1;
         }
      } else {
         // Wrap around edges (hide behind offset to prevent popping)
         if (this.position.x + offset < 0) this.position.x = p.width + offset;
         if (this.position.x - offset > p.width) this.position.x = -offset;
         if (this.position.y + offset < 0) this.position.y = p.height + offset;
         if (this.position.y - offset > p.height) this.position.y = -offset;
      }
   }


   public draw(spheresInverseAlpha: boolean) {
      const p = this.p;

      p.push();
      p.noFill();
      p.stroke(255, spheresInverseAlpha ? Math.min(255, (255 - this.alpha) * 1.5) : this.alpha);

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
