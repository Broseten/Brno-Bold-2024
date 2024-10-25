import p5 from 'p5';
import '../css/style.css';

const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
  };

  p.draw = () => {
    p.background(0);
    p.fill(255, 0, 0);
    p.noStroke();
    p.rectMode(p.CENTER);
    p.rect(p.mouseX, p.mouseY, 50, 50);
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };
};

new p5(sketch);
