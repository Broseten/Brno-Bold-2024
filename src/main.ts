import p5 from 'p5';
import '../css/style.css';
import { FlowCalculator, copyImage, same } from './flow';

// Off-screen buffer for proper fading to black
let b: p5.Graphics;

let gridSize = 24;      // Spacing to check flow
let ignoreThresh = 10;  // Ignore movements below this level

let flow: FlowCalculator;               // Calculated flow for entire image
let previousPixels: Uint8ClampedArray | null;     // Copy of previous frame
let video: p5.Element;

let circlesPositions: p5.Vector[][] = [];

let blackc: p5.Color;
let redc: p5.Color;
let cScheme = 0;

let lastSwitchTime = 0;

const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(640, 480);
    b = p.createGraphics(p.width, p.height); // Create an off-screen buffer

    // TODO be able to disable the capture?
    video = p.createCapture((p as any).VIDEO);
    video.size(p.width, p.height);
    video.hide();

    // Set up flow calculator
    flow = new FlowCalculator(gridSize);

    for (let x = 0; x < gridSize; x++) {
      circlesPositions[x] = [];
      for (let y = 0; y < gridSize; y++) {
        circlesPositions[x][y] = new p5.Vector(0, 0);
      }
    }

    blackc = p.color(0, 0, 0);
    redc = p.color(255, 0, 0);
  };

  p.draw = () => {
    let [c1, c2] = colorScheme();

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
      if (flow.zones) {
        let i = 0;
        let sumMovement = 0;

        for (let zone of flow.zones) {
          let x = i % gridSize;
          let y = Math.floor(i / gridSize);
          i++;

          let mag = p.dist(0, 0, zone.movement.x, zone.movement.y);

          // If a zone's flow magnitude (strength) is less than a set threshold, don't display
          // if (mag < ignoreThresh) {
          //   continue;
          // }

          // If the movement is high enough, add it to sum
          if (mag > 40) {
            sumMovement += mag;
          }

          circlesPositions[x][y].add(zone.movement.copy().mult(2)); // Use copy to avoid modifying original

          (b as any).push();
          (b as any).translate(zone.pos.x, zone.pos.y);

          (b as any).noStroke();
          (b as any).fill(c2);
          let size = p.dist(0, 0, circlesPositions[x][y].x, circlesPositions[x][y].y);
          (b as any).circle(circlesPositions[x][y].x, circlesPositions[x][y].y, size / 3);

          (b as any).pop();

          circlesPositions[x][y].mult(0.5);
        }

        if (sumMovement > gridSize * gridSize * 0.5) {
          let secToSwitch = 3;
          let nextSwitch = lastSwitchTime + 1000 * secToSwitch;
          if (p.millis() > nextSwitch) {
            lastSwitchTime = p.millis();
            switchColors();
          }
        }
      }

      // Copy the current pixels into previous for the next frame
      previousPixels = copyImage((video as any).pixels, previousPixels);
    }

    // Mirror everything
    p.translate(p.width, 0);
    p.scale(-1, 1);
    // Draw the buffer onto the main canvas
    p.image(b, 0, 0, p.width, p.height);
  };

  // p.windowResized = () => {
  //   p.resizeCanvas(p.windowWidth, p.windowHeight);
  // };

  p.mouseClicked = () => {
    switchColors();
  };

  function colorScheme() {
    let colors = [blackc, redc];
    switch (cScheme) {
      case 1:
        colors = [redc, blackc];
        break;
      default:
        break;
    }
    return colors;
  }

  function switchColors() {
    cScheme = (cScheme + 1) % 2;
  }
};

// New p5 instance
new p5(sketch);
