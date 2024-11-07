import p5 from 'p5';
import '../css/style.css';
import { FlowCalculator, copyImage, same } from './flow';
import { Grid } from './grid';

// Off-screen buffer for proper fading to black
let b: p5.Graphics;

let samplingGridSize = 16;      // Spacing to check flow

let flow: FlowCalculator;               // Calculated flow for entire image
let previousPixels: Uint8ClampedArray | null;     // Copy of previous frame
let video: p5.Element;

let blackColor: p5.Color;
let redColor: p5.Color;

// dumb but simple 0 or 1
let colorScheme = 0;

let lastSwitchTime = 0;

let grid: Grid;

// TODO settings/parameters in a menu that gets displayed on button press -- move FPS and video debug there as well

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

      grid = new Grid(0, 0, b.width, b.height, 40);

      blackColor = p.color(0, 0, 0);
      redColor = p.color(255, 0, 0);
   };

   p.draw = () => {
      let [c1, c2] = changeColorScheme();

      (b as any).background(p.red(c1), p.green(c1), p.blue(c1), 10);

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
            grid.update(p, flow.zones);
            (b as any).noStroke();
            (b as any).fill(c2);
            grid.draw(b);

            // TODO use flow.u and flow.v to get total movement to detect huge movements (can be directional)
            // if () {
            //    let secToSwitch = 3;
            //    let nextSwitch = lastSwitchTime + 1000 * secToSwitch;
            //    if (p.millis() > nextSwitch) {
            //       lastSwitchTime = p.millis();
            //       switchColors();
            //    }
            // }
         }

         // Copy the current pixels into previous for the next frame
         previousPixels = copyImage((video as any).pixels, previousPixels);
      }

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
      grid = new Grid(0, 0, b.width, b.height, 30, 40);
   };

   p.mouseClicked = () => {
      switchColors();
   };

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

   function switchColors() {
      colorScheme = (colorScheme + 1) % 2;
   }
};

// New p5 instance
new p5(sketch);
