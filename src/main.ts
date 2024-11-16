import p5, { Vector } from 'p5';
import '../css/style.css';
import { FlowCalculator, copyImage, same } from './flow';
import { Grid } from './grid';
import { Sphere } from './sphere';

/// Parameters
// TODO: Add settings/parameters to a menu displayed on button press.
//       Move FPS and video debug there as well and only show certain parameters.

// Camera (for flow detection)
const CAMERA_X_RESOLUTION = 640;
const CAMERA_Y_RESOLUTION = 480;

// Global movement detection
// Adjusts movement sensitivity based on the expected size of the area where people will move.
// -- the lower to less movement needed (more sensitive)
// TODO tweak the values so that it makes sense according to the portion of the camera
// TODO add debug menu for that - ideally HTML popup window? so that we can easily tweak in a runtime build (save cookie or something so that the tweak is persistent)
// TODO adjust the thershold (add another multiplier?) according to the time?
//      If nothing happend for more then a few minutes, than make the threshold really low
//      if something just happened make the threshold high (map between two thresolds based on time)
const GLOBAL_MOVEMENT_THRESHOLD_MULTIPLIER = 0.0035;
// Cooldown for movement-triggered events.
const SECONDS_TO_NEXT_GLOBAL_MOVE_EVENT = 5;

// Visuals
// Background fade effect.
const BACKGROUND_ALPHA = 8;
// Number of spheres in the simulation.
const SPHERE_COUNT = 5;
// Grid size for flow calculations.
const SAMPLING_GRID_SIZE = 16;
// Spacing between grid points.
const GRID_SPACING = 42;

// Sphere parameters
// Minimum sphere size.
const SPHERE_SIZE_RANGE_MIN = 50;
// Maximum sphere size.
const SPHERE_SIZE_RANGE_MAX = 100;
// Minimum movement speed for spheres.
const SPHERE_MOVE_SPEED_MIN = 1;
// Maximum movement speed for spheres.
const SPHERE_MOVE_SPEED_MAX = 4;
// Minimum rotation speed.
const SPHERE_ROTATION_SPEED_MIN = 0.01;
// Maximum rotation speed.
const SPHERE_ROTATION_SPEED_MAX = 0.03;
// Minimum size oscillation speed.
const SPHERE_SIZE_CHANGE_SPEED_MIN = 0.1;
// Maximum size oscillation speed.
const SPHERE_SIZE_CHANGE_SPEED_MAX = 0.5;


/// Data variables

let blackColor: p5.Color;
let redColor: p5.Color;

// Off-screen buffer for proper fading to black.
let screenBuffer: p5.Graphics;
// Calculated flow for the entire image.
let flow: FlowCalculator;
// Copy of previous frame.
let previousPixels: Uint8ClampedArray | null;
let video: p5.Element;

// Dumb but simple 0 or 1 (used for color schemes).
let colorScheme = 0;
// Last recorded time of a movement-triggered event in milliseconds.
let lastMoveEventTimeMillis = 0;

let grid: Grid;

let spheres: Sphere[] = [];

let textBuffer: p5.Graphics;

// Represents the global movement in the scene, with -1 as the initial value.
let globalMovement = -1;

let debug = false;

let paused = false;

const sketch = (p: p5) => {
   p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
      // Create off-screen buffers.
      screenBuffer = p.createGraphics(p.width, p.height);
      textBuffer = p.createGraphics(p.width, p.height);

      startCapture();

      // Set up flow calculator.
      flow = new FlowCalculator(SAMPLING_GRID_SIZE);

      // Set up the grid of circles.
      grid = new Grid(0, 0, screenBuffer.width, screenBuffer.height, GRID_SPACING);

      // Initialize spheres.
      for (let i = 0; i < SPHERE_COUNT; i++) {
         const sizeRange = new Vector(
            p.random(SPHERE_SIZE_RANGE_MIN, SPHERE_SIZE_RANGE_MAX),
            p.random(SPHERE_SIZE_RANGE_MIN, SPHERE_SIZE_RANGE_MAX)
         );
         const startPosition = new Vector(p.random(p.width), p.random(p.height));
         const moveSpeed = p.random(SPHERE_MOVE_SPEED_MIN, SPHERE_MOVE_SPEED_MAX);
         const rotationSpeed = p.random(SPHERE_ROTATION_SPEED_MIN, SPHERE_ROTATION_SPEED_MAX);
         const sizeChangeSpeed = p.random(SPHERE_SIZE_CHANGE_SPEED_MIN, SPHERE_SIZE_CHANGE_SPEED_MAX);
         spheres.push(new Sphere(p, sizeRange, startPosition, moveSpeed, rotationSpeed, sizeChangeSpeed));
      }

      blackColor = p.color(0, 0, 0);
      redColor = p.color(255, 0, 0);
   };

   p.draw = () => {
      if (paused) {
         p.background(0);
         (textBuffer as any).clear();
         (textBuffer as any).fill(255);
         (textBuffer as any).textSize(16);
         (textBuffer as any).textAlign(p.CENTER, p.CENTER);
         (textBuffer as any).text("paused", p.width / 2, p.height / 4);
         p.image(textBuffer, -p.width / 2, -p.height / 2, p.width, p.height);
         return;
      }

      let [c1, c2] = changeColorScheme();

      (screenBuffer as any).background(p.red(c1), p.green(c1), p.blue(c1), BACKGROUND_ALPHA);

      flowGrid();

      (screenBuffer as any).noStroke();
      (screenBuffer as any).fill(c2);
      grid.draw(screenBuffer);

      p.push();
      // Translate to correct position - WEBGL or not, we need some translation.
      p.translate(0.5 * p.width, -0.5 * p.height);
      // Mirror everything.
      p.scale(-1, 1);
      // Draw the buffer onto the main canvas.
      p.image(screenBuffer, 0, 0, p.width, p.height);
      p.pop();

      spheres.forEach((sphere) => {
         // Mirror the flow in x.
         sphere.update(new Vector(flow.u ? -flow.u : 0, flow.v ? flow.v : 0));
         sphere.draw();

         spheres.forEach((other) => {
            if (sphere !== other) {
               sphere.collide(other);
            }
         });
      });

      if (debug) {
         debugStuff();
         // The text buffer can be used for text in the future, for now, it is just for debug text.
         p.image(textBuffer, -p.width / 2, -p.height / 2, p.width, p.height);
      }
   };

   p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      // Reset the grid.
      grid = new Grid(0, 0, screenBuffer.width, screenBuffer.height, GRID_SPACING);
   };

   p.keyReleased = () => {
      if (p.key === 'd') debug = !debug;
      else if (p.key === ' ') switchColors();
      else if (p.key === 'r') p.setup();
      else if (p.key == 'p') {
         if (paused) {
            startCapture();
         } else {
            stopCapture();
         }
         paused = !paused;
      }
   };

   function startCapture() {
      video = p.createCapture((p as any).VIDEO);
      video.size(CAMERA_X_RESOLUTION, CAMERA_Y_RESOLUTION); // Should match the grid sampling size somehow, but not necessary.
      video.hide();
   }

   function stopCapture() {
      video.remove();
   }

   function debugStuff() {
      (textBuffer as any).clear();
      (textBuffer as any).fill(255);
      (textBuffer as any).textSize(16);
      (textBuffer as any).textAlign(p.LEFT, p.TOP);
      (textBuffer as any).text(`FPS: ${Math.floor(p.frameRate())}`, 10, 10);
   }

   function flowGrid() {
      (video as any).loadPixels();
      if ((video as any).pixels.length > 0) {
         if (previousPixels) {
            if (same(previousPixels, (video as any).pixels, 4, p.width)) {
               return;
            }
            flow.calculate(previousPixels, (video as any).pixels, video.width, video.height);
         }

         if (flow.zones && flow.zones[0]) {
            globalMovement = grid.update(p, flow.zones);
            checkGlobalFlowEvent();
         }

         previousPixels = copyImage((video as any).pixels, previousPixels);
      }
   }

   function changeColorScheme() {
      let colors = [blackColor, redColor];
      switch (colorScheme) {
         case 1:
            colors = [redColor, blackColor];
            break;
         default:
            break;
      }
      return colors;
   }

   function checkGlobalFlowEvent() {
      if (isGlobalMovementThresholdExceeded()) {
         let nextSwitch = lastMoveEventTimeMillis + 1000 * SECONDS_TO_NEXT_GLOBAL_MOVE_EVENT;
         if (p.millis() > nextSwitch) {
            lastMoveEventTimeMillis = p.millis();
            globalMovementThresholdExceeded();
         }
      }
   }

   function globalMovementThresholdExceeded() {
      switchColors();
   }

   function switchColors() {
      colorScheme = (colorScheme + 1) % 2;
   }
};

export function isGlobalMovementThresholdExceeded() {
   return globalMovement > (GLOBAL_MOVEMENT_THRESHOLD_MULTIPLIER * grid.width * grid.height);
}

// New p5 instance
new p5(sketch);
