import p5, { Vector } from 'p5';
import '../css/style.css';
import { FlowCalculator, copyImage, same } from './flow';
import { Grid } from './grid';
import { Sphere } from './sphere';

/// Parameters
// TODO settings/parameters in a menu that gets displayed on button press -- move FPS and video debug there as well
//      - only show certain parameters
//      - extract all parameters and constants from the whole system (e.g. from the circle class)

// this has to be adjusted according to the expected size of the area where people will move -- the lower to less movement needed
const globalMovementTresholdMultiplier = 0.005;
const secondsToNextGlobalMoveEvent = 5;

let blackColor: p5.Color;
let redColor: p5.Color;

const backgroundAlpha = 8;


/// Data variables

// Off-screen buffer for proper fading to black
let screenBuffer: p5.Graphics;
// Calculated flow for entire image
let flow: FlowCalculator;
// Copy of previous frame
let previousPixels: Uint8ClampedArray | null;
let video: p5.Element;

// Spacing to check flow
let samplingGridSize = 16;

// dumb but simple 0 or 1
let colorScheme = 0;
let lastMoveEventTimeMillis = 0;

let grid: Grid;

let spheres: Sphere[] = [];

let textBuffer: p5.Graphics;

let globalMovement = -1;

// enum Mode {
//    Flow,
//    Brightness,
//    None
// }

let debug = true;

// let mode: Mode = Mode.Flow;

const sketch = (p: p5) => {

   p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
      // Create off-screen buffers
      screenBuffer = p.createGraphics(p.width, p.height);
      textBuffer = p.createGraphics(p.width, p.height);

      video = p.createCapture((p as any).VIDEO);
      video.size(640, 480); // should match the grid sampling size somehow, but not neccessary I guess
      video.hide();

      // Set up flow calculator
      flow = new FlowCalculator(samplingGridSize);

      // Set up the grid of circles
      let gridSpacing = 42;
      grid = new Grid(0, 0, screenBuffer.width, screenBuffer.height, gridSpacing);

      // TODO parameter
      const sphereCount = 5;
      // init spheres
      for (let i = 0; i < sphereCount; i++) {
         const sizeRange = new Vector(p.random(50, 80), p.random(80, 100));
         const startPosition = new Vector(p.random(p.width), p.random(p.height));
         const moveSpeed = p.random(1, 4);
         const rotationSpeed = p.random(0.01, 0.03);
         const sizeChangeSpeed = p.random(0.1, 0.5);
         spheres.push(new Sphere(p, sizeRange, startPosition, moveSpeed, rotationSpeed, sizeChangeSpeed));
      }

      blackColor = p.color(0, 0, 0);
      redColor = p.color(255, 0, 0);
   };

   p.draw = () => {
      let [c1, c2] = changeColorScheme();

      (screenBuffer as any).background(p.red(c1), p.green(c1), p.blue(c1), backgroundAlpha);

      flowGrid();
      // switch (+mode) {
      //    case Mode.Flow:
      //       flowGrid();
      //       break;
      //    case Mode.Brightness:
      //       brightnessGrid();
      //       break;
      //    default:
      //       break;
      // }

      (screenBuffer as any).noStroke();
      (screenBuffer as any).fill(c2);
      grid.draw(screenBuffer);

      p.push();
      // translate to correct position - WEBGL or not we need some translation
      p.translate(0.5 * p.width, -0.5 * p.height);
      // Mirror everything
      p.scale(-1, 1);
      // Draw the buffer onto the main canvas
      p.image(screenBuffer, 0, 0, p.width, p.height);
      p.pop();

      spheres.forEach((sphere) => {
         // mirror the flow in x
         sphere.update(new Vector(flow.u ? -flow.u : 0, flow.v ? flow.v : 0));
         sphere.draw();

         spheres.forEach((other) => {
            if (sphere !== other) {
               sphere.collide(other)
            }
         });
      });

      if (debug) {
         debugStuff();
         // the text buffer can be used for text in the future, for now, it is just for debug text
         p.image(textBuffer, -p.width / 2, -p.height / 2, p.width, p.height);
      }
   };

   p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      // reset the grid
      grid = new Grid(0, 0, screenBuffer.width, screenBuffer.height, 30);
   };

   p.keyReleased = () => {
      if (p.key === "d") debug = !debug;
      else if (p.key === " ") switchColors();
      // TODO add debug menu - ideally HTML popup window?
   };

   // function brightnessGrid() {
   //    (video as any).loadPixels();
   //    if ((video as any).pixels.length > 0) {

   //    }
   // }

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
         // Calculate flow (but skip if the current and previous frames are the same)
         if (previousPixels) {
            if (same(previousPixels, (video as any).pixels, 4, p.width)) {
               return;
            }
            flow.calculate(previousPixels, (video as any).pixels, video.width, video.height);
         }

         // If flow zones have been found, display them
         if (flow.zones && flow.zones[0]) {
            globalMovement = grid.update(p, flow.zones);
            checkGlobalFlowEvent();
         }

         // Copy the current pixels into previous for the next frame
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

   // Detects movement spikes
   function checkGlobalFlowEvent() {
      if (isGlobalMovementTresholdExceeded()) {
         let nextSwitch = lastMoveEventTimeMillis + 1000 * secondsToNextGlobalMoveEvent;
         if (p.millis() > nextSwitch) {
            lastMoveEventTimeMillis = p.millis();
            globalMovementTresholdExceeded();
         }
      }
   }

   function globalMovementTresholdExceeded() {
      // TODO detect direction of the flow?
      // let globalFlow = new Vector(flow.u, flow.v);
      // Do also other things?
      switchColors();
   }

   function switchColors() {
      colorScheme = (colorScheme + 1) % 2;
   }
};

export function isGlobalMovementTresholdExceeded() {
   // TODO adjust the thershold according to the time? If nothing happend for more then a few minutes, than make the threshold really low
   //      if something just happened make the threshold high (map between two thresolds based on time)
   // TODO tweak the values so that it makes sense according to the portion of the camera
   return globalMovement > (globalMovementTresholdMultiplier * grid.width * grid.height);
}

// New p5 instance
new p5(sketch);
