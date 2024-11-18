import p5, { Vector } from 'p5';
import '../css/style.css';
import { FlowCalculator, copyImage, same } from './flow';
import { Grid } from './grid';
import { Sphere } from './sphere';
import { GridCellMode } from './grid_cell';


const MOVEMENT_DETECTION_TRESHOLD_COOKIE = "globalMoveTreshValue";

// Global movement detection
// Adjusts movement sensitivity based on the expected size of the area where people will move.
// TODO adjust the thershold (add another multiplier?) according to the time?
//      If nothing happend for more then a few minutes, than make the threshold really low
//      if something just happened make the threshold high (map between two thresolds based on time)
// This is set from the settings window in the sketch
let globalMoveSensitivity = 70; // Default value

/// Parameters
// TODO: Add settings/parameters to a menu displayed on button press.
//       Move FPS and video debug there as well and only show certain parameters.

// Camera (for flow detection)
const CAMERA_X_RESOLUTION = 640;
const CAMERA_Y_RESOLUTION = 480;

// Cooldown for movement-triggered events.
const SECONDS_TO_NEXT_GLOBAL_MOVE_EVENT = 3;

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
// Minimum sphere size -- relative to the smaller screen size dimension
const SPHERE_SIZE_RANGE_MIN = 0.03;
// Maximum sphere size  -- relative to the smaller screen size dimension
const SPHERE_SIZE_RANGE_MAX = 0.15;
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
// IF true, spheres bounce of the edges. False, the wrap around.
const SPHERE_BOUNCE = true;

const SPHERE_ALLOW_RANDOMIZE_ALPHA_MODE = true;

const allowedModes = [
   GridCellMode.Circle,
   GridCellMode.SquareSquare,
   GridCellMode.Letter,
   GridCellMode.Square,
   GridCellMode.SquareCircle,
   GridCellMode.RotatingSquare,
   GridCellMode.SquareSquareInverse
];

/// Data variables

let gridMode = GridCellMode.Circle;

let blackColor: p5.Color;
let redColor: p5.Color;
let colorScheme: p5.Color[];

// Off-screen buffer for proper fading to black.
let screenBuffer: p5.Graphics;
// Calculated flow for the entire image.
let flow: FlowCalculator;
// Copy of previous frame.
let previousPixels: Uint8ClampedArray | null;
let video: p5.Element;

// Last recorded time of a movement-triggered event in milliseconds.
let lastMoveEventTimeMillis = 0;

let grid: Grid;

let spheres: Sphere[];

let textBuffer: p5.Graphics;

// Represents the global movement in the scene, with -1 as the initial value.
let globalMovement = -1;

let debug = false;

let paused = false;

let spheresInverseAlpha = false;

let settingsVisible = false;

let boldFont: p5.Font;

const sketch = (p: p5) => {

   // Load the font in the preload function
   p.preload = () => {
      // use the base path since we are deplying to pages under subdir with the repo name
      boldFont = p.loadFont(`${import.meta.env.BASE_URL}/assets/fonts/BrnoBold.otf`);
   };

   p.setup = () => {
      initCookiesValue();
      setupSettingsModal();

      p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
      // Create off-screen buffers.
      screenBuffer = p.createGraphics(p.width, p.height);
      textBuffer = p.createGraphics(p.width, p.height);

      (screenBuffer as any).textFont(boldFont);
      (screenBuffer as any).textStyle(p.BOLD);

      startCapture();

      // Set up flow calculator.
      flow = new FlowCalculator(SAMPLING_GRID_SIZE);

      // Set up the grid of circles.
      grid = new Grid(p, 0, 0, screenBuffer.width, screenBuffer.height, GRID_SPACING);

      // Initialize spheres.
      spheres = [];
      for (let i = 0; i < SPHERE_COUNT; i++) {
         const relativeSizeRange = new Vector(
            ...[p.random(SPHERE_SIZE_RANGE_MIN, SPHERE_SIZE_RANGE_MAX),
            p.random(SPHERE_SIZE_RANGE_MIN, SPHERE_SIZE_RANGE_MAX)].sort((x, y) => x - y)
         );
         const sizeRangePixels = relativeSizeRange.copy().mult(p.min(p.width, p.height));
         const startPosition = new Vector(
            p.random(sizeRangePixels.y, p.width - sizeRangePixels.y),
            p.random(sizeRangePixels.y, p.height - sizeRangePixels.y)
         );
         const moveSpeed = p.random(SPHERE_MOVE_SPEED_MIN, SPHERE_MOVE_SPEED_MAX);
         const rotationSpeed = p.random(SPHERE_ROTATION_SPEED_MIN, SPHERE_ROTATION_SPEED_MAX);
         const sizeChangeSpeed = p.random(SPHERE_SIZE_CHANGE_SPEED_MIN, SPHERE_SIZE_CHANGE_SPEED_MAX);
         spheres.push(new Sphere(p, sizeRangePixels, startPosition, moveSpeed, rotationSpeed, sizeChangeSpeed));
      }

      blackColor = p.color(0, 0, 0);
      redColor = p.color(255, 0, 0);
      colorScheme = [blackColor, redColor];
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

      let [backgroundColor, mainColor] = colorScheme;

      let ba = BACKGROUND_ALPHA;
      if (gridMode === GridCellMode.Letter || gridMode === GridCellMode.SquareCircle) {
         ba = BACKGROUND_ALPHA * 10;
      }
      (screenBuffer as any).background(
         p.red(backgroundColor),
         p.green(backgroundColor),
         p.blue(backgroundColor),
         ba
      );

      flowGrid();

      grid.draw(gridMode, backgroundColor, mainColor, screenBuffer);

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
         sphere.update(spheresInverseAlpha, new Vector(flow.u ? -flow.u : 0, flow.v ? flow.v : 0), SPHERE_BOUNCE);
         sphere.draw(spheresInverseAlpha);

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
      grid = new Grid(p, 0, 0, screenBuffer.width, screenBuffer.height, GRID_SPACING);
   };

   p.keyReleased = () => {
      const key = p.key.toLowerCase();
      if (key === 'd') debug = !debug;
      else if (key === 'c') changeColorScheme();
      else if (key === 'a') changeSphereAlphaMode();
      else if (key === ' ') switchMode();
      else if (key === 'r') p.setup();
      else if (key == 's') {
         toggleModal();
      }
      else if (key == 'p') {
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
            globalMovement = grid.update(flow.zones);
            checkGlobalFlowEvent();
         }

         previousPixels = copyImage((video as any).pixels, previousPixels);
      }
   }

   function changeColorScheme() {
      colorScheme = colorScheme.reverse();
   }

   function randomColorScheme() {
      colorScheme = colorScheme.sort(() => p.random());
   }

   function checkGlobalFlowEvent() {
      if (isGlobalMovementThresholdExceeded(p)) {
         let nextSwitch = lastMoveEventTimeMillis + 1000 * SECONDS_TO_NEXT_GLOBAL_MOVE_EVENT;
         if (p.millis() > nextSwitch) {
            lastMoveEventTimeMillis = p.millis();
            globalMovementThresholdExceeded();
         }
      }
   }

   function globalMovementThresholdExceeded() {
      // will randomize the original array...whatever
      allowedModes.sort(() => p.random());
      nextGridCellMode();
      // randomize colors
      randomColorScheme();
      // change the spheres behavior
      if (SPHERE_ALLOW_RANDOMIZE_ALPHA_MODE) changeSphereAlphaMode();
   }

   function changeSphereAlphaMode() {
      spheresInverseAlpha = p.random() < 0.5;
   }

   function switchMode() {
      nextGridCellMode();
   }

   function nextGridCellMode() {
      // return last
      allowedModes.push(gridMode);
      // pick first
      gridMode = allowedModes.shift()!;
   }
};

export function isGlobalMovementThresholdExceeded(p: p5) {
   // range from 1 to 100
   const threshold = 101 - globalMoveSensitivity;
   const thresholdMultiplier = p.map(threshold, 1, 100, 0.001, 0.008);
   return globalMovement > (thresholdMultiplier * grid.width * grid.height);
}

// Function to read cookies
function readCookie(name: string): number | null {
   const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
   return match ? parseInt(match[2], 10) : null;
}

// Function to write cookies
function writeCookie(name: string, value: number, days: number) {
   const date = new Date();
   date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
   document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/`;
}

// Function to toggle modal visibility
function toggleModal() {
   settingsVisible = !settingsVisible;
   const modal = document.getElementById('settings-modal')!;
   modal.style.display = settingsVisible ? 'block' : 'none';
}

// Set up event listeners for the modal
function setupSettingsModal() {
   const slider = document.getElementById('parameter-slider') as HTMLInputElement;
   const valueDisplay = document.getElementById('slider-value')!;
   const closeButton = document.getElementById('close-modal')!;
   slider.value = globalMoveSensitivity.toString();

   // Initialize slider and display with the saved value
   slider.value = globalMoveSensitivity.toString();
   valueDisplay.textContent = globalMoveSensitivity.toString();

   slider.addEventListener('input', () => {
      globalMoveSensitivity = parseInt(slider.value, 10);
      valueDisplay.textContent = globalMoveSensitivity.toString();
      writeCookie(MOVEMENT_DETECTION_TRESHOLD_COOKIE, globalMoveSensitivity, 7); // Save value for 7 days
   });

   closeButton.addEventListener('click', () => {
      toggleModal();
   });
}

// Initialize parameter value from cookies
function initCookiesValue() {
   const cookieValue = readCookie(MOVEMENT_DETECTION_TRESHOLD_COOKIE);
   if (cookieValue !== null) {
      globalMoveSensitivity = cookieValue;
   }
}

// New p5 instance
new p5(sketch);
