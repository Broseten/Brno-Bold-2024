import p5, { Vector } from 'p5';
import '../css/style.css';
import { FlowCalculator, copyImage, same } from './flow';
import { Grid } from './grid';

/// Parameters
// TODO settings/parameters in a menu that gets displayed on button press -- move FPS and video debug there as well
//      - only show certain parameters
//      - extract all parameters and constants from the whole system (e.g. from the circle class)

let globalMovementTresholdMultiplier = 0.007;
let secondsToNextGlobalMoveEvent = 5;

let blackColor: p5.Color;
let redColor: p5.Color;


/// Data variables

// Off-screen buffer for proper fading to black
let b: p5.Graphics;
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

// enum Mode {
//    Flow,
//    Brightness,
//    None
// }

// let mode: Mode = Mode.Flow;

const sketch = (p: p5) => {

   p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight);
      b = p.createGraphics(p.width, p.height); // Create an off-screen buffer

      // TODO how to handle different display resolution compared to the camera (will look weird now when just scaled)
      video = p.createCapture((p as any).VIDEO);
      video.size(640, 480); // should match the grid sampling size somehow, but not neccessary I guess
      video.hide();

      // Set up flow calculator
      flow = new FlowCalculator(samplingGridSize);

      // Set up the grid of circles
      let gridSpacing = 42;
      grid = new Grid(0, 0, b.width, b.height, gridSpacing);

      blackColor = p.color(0, 0, 0);
      redColor = p.color(255, 0, 0);
   };

   p.draw = () => {
      let [c1, c2] = changeColorScheme();

      (b as any).background(p.red(c1), p.green(c1), p.blue(c1), 10);

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

      (b as any).noStroke();
      (b as any).fill(c2);
      grid.draw(b);

      p.push();
      // Mirror everything
      p.translate(p.width, 0);
      p.scale(-1, 1);
      // Draw the buffer onto the main canvas
      p.image(b, 0, 0, p.width, p.height);
      p.pop();

      p.fill(255);
      let fps = p.frameRate();
      p.text("FPS " + Math.floor(fps), 50, 50);
   };

   p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      // reset the grid
      grid = new Grid(0, 0, b.width, b.height, 30);
   };

   p.keyReleased = () => {
      if (p.key == " ") switchColors();
      // TODO add debug menu - ideally HTML popup window?
   };

   // function brightnessGrid() {
   //    (video as any).loadPixels();
   //    if ((video as any).pixels.length > 0) {
         
   //    }
   // }

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
            // console.log(`Should: ${estFlowH * estFlowW} Got: ${flow.zones.length}`);
            let globalMovement = grid.update(p, flow.zones);

            checkGlobalFlowEvent(globalMovement);
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

   function checkGlobalFlowEvent(globalMovement: number) {
      // TODO adjust the thershold according to the time? If nothing happend for more then a few minutes, than make the threshold really low
      //      if something just happened make the threshold high (map between two thresolds based on time)
      let threshold = globalMovementTresholdMultiplier * grid.width * grid.height;
      // TODO tweak the values so that it makes sense according to the portion of the camera
      if (globalMovement > threshold) {
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

// New p5 instance
new p5(sketch);
