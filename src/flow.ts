import p5 from 'p5'; // Default import for p5.js

// from https://editor.p5js.org/kylemcdonald/sketches/rJg3gPc3Q 
// https://www.youtube.com/watch?v=nyWi_yieg5w&ab_channel=JeffThompson

// That version via: 
// https://github.com/anvaka/oflow


// modified by Vojtech Bruza

// Quickly copy image
export function copyImage(
   source: Uint8ClampedArray,
   previousPixels: Uint8ClampedArray | null
): Uint8ClampedArray {
   // If previousPixels is null, create a new Uint8ClampedArray of the same size as the source
   if (!previousPixels) {
      return new Uint8ClampedArray(source.length);
   }

   // Copy the source pixels into previousPixels
   for (let i = 0; i < source.length; i++) {
      previousPixels[i] = source[i];
   }

   return previousPixels;
}

// Quick way to check if two video frames are the same or not
export function same(a1: Uint8ClampedArray, a2: Uint8ClampedArray, stride: number, n: number): boolean {
   for (let i = 0; i < n; i += stride) {
      if (a1[i] !== a2[i]) {
         return false;
      }
   }
   return true;
}

// Each region of flow in the image
export class FlowZone {
   pos: p5.Vector;
   movement: p5.Vector;

   constructor(x: number, y: number, u: number, v: number) {
      this.pos = new p5.Vector(x, y); // Use p5's Vector constructor
      this.movement = new p5.Vector(u, v); // Use p5's Vector constructor
   }
}

// Calculates flow for the entire image
export class FlowCalculator {
   step: number;
   zones: FlowZone[][] | undefined;
   u: number | undefined;
   v: number | undefined;

   constructor(step: number = 8) {
      this.step = step;
      this.zones = undefined;
      this.u = undefined;
      this.v = undefined;
   }

   // Assumes rgba images, but only uses one channel
   calculate(oldImage: Uint8ClampedArray, newImage: Uint8ClampedArray, width: number, height: number) {
      let zones: FlowZone[][] = [];
      let step = this.step;
      let winStep = step * 2 + 1;

      let A2, A1B2, B1, C1, C2;
      let u, v, uu, vv;
      uu = vv = 0;
      let wMax = width - step - 1;
      let hMax = height - step - 1;

      for (let globalY = step + 1; globalY < hMax; globalY += winStep) {
         let row: FlowZone[] = [];

         for (let globalX = step + 1; globalX < wMax; globalX += winStep) {
            A2 = A1B2 = B1 = C1 = C2 = 0;

            for (let localY = -step; localY <= step; localY++) {
               for (let localX = -step; localX <= step; localX++) {
                  let address = (globalY + localY) * width + globalX + localX;

                  let gradX = (newImage[(address - 1) * 4]) - (newImage[(address + 1) * 4]);
                  let gradY = (newImage[(address - width) * 4]) - (newImage[(address + width) * 4]);
                  let gradT = (oldImage[address * 4]) - (newImage[address * 4]);

                  A2 += gradX * gradX;
                  A1B2 += gradX * gradY;
                  B1 += gradY * gradY;
                  C2 += gradX * gradT;
                  C1 += gradY * gradT;
               }
            }

            // System is not singular (solving by Kramer method)
            let delta = (A1B2 * A1B2 - A2 * B1);
            if (delta !== 0) {
               let Idelta = step / delta;
               let deltaX = -(C1 * A1B2 - C2 * B1);
               let deltaY = -(A1B2 * C2 - A2 * C1);

               u = deltaX * Idelta;
               v = deltaY * Idelta;
            }
            // Singular system (find optical flow in gradient direction)
            else {
               let norm = (A1B2 + A2) * (A1B2 + A2) + (B1 + A1B2) * (B1 + A1B2);
               if (norm !== 0) {
                  let IGradNorm = step / norm;
                  let temp = -(C1 + C2) * IGradNorm;

                  u = (A1B2 + A2) * temp;
                  v = (B1 + A1B2) * temp;
               }
               else {
                  u = v = 0;
               }
            }

            if (-winStep < u && u < winStep && -winStep < v && v < winStep) {
               uu += u;
               vv += v;
               row.push(new FlowZone(globalX, globalY, u, v));
            }
         }

         zones.push(row);
      }

      // The final data
      this.zones = zones;
      this.u = uu / zones.flat().length;
      this.v = vv / zones.flat().length;
   }
}
