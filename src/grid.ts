import p5 from "p5";
import { Circle } from "./circle";
import { FlowZone } from "./flow";

export class Grid {
   // rows x columns
   gridCircles: Circle[][] = [];

   constructor(
      public x: number,
      public y: number,
      public width: number,
      public height: number,
      public gridCellSize: number
   ) {
      let rows = Math.ceil(this.height / gridCellSize);
      let cols = Math.ceil(this.width / gridCellSize);
      // offset by half
      for (let row = 0; row < rows; row++) {
         let relY = gridCellSize / 2 + row * gridCellSize;
         this.gridCircles[row] = [];
         for (let col = 0; col < cols; col++) {
            let relX = gridCellSize / 2 + col * gridCellSize;
            this.gridCircles[row][col] = new Circle(new p5.Vector(relX, relY));
         }
      }
   }

   public update(p: p5, flowZones: FlowZone[][]): void {
      // Dimensions of the flow zone grid
      const flowZoneRows = flowZones.length;
      const flowZoneCols = flowZones[0]?.length || 0;

      this.gridCircles.forEach((row) => {
         row.forEach((circle) => {
            // Map grid position to flow zone indices
            let mappedX = p.map(circle.position.x, 0, this.width, 0, flowZoneCols);
            let mappedY = p.map(circle.position.y, 0, this.height, 0, flowZoneRows);

            // Indices for the four surrounding zones
            let zoneColLeft = Math.floor(mappedX);
            let zoneColRight = Math.min(zoneColLeft + 1, flowZoneCols - 1);
            let zoneRowTop = Math.floor(mappedY);
            let zoneRowBottom = Math.min(zoneRowTop + 1, flowZoneRows - 1);

            // Interpolation weights
            let xFraction = mappedX - zoneColLeft;
            let yFraction = mappedY - zoneRowTop;

            // Neighboring FlowZones, ensuring they exist
            const topLeft = flowZones[zoneRowTop]?.[zoneColLeft]?.movement ?? p.createVector(0, 0);
            const topRight = flowZones[zoneRowTop]?.[zoneColRight]?.movement ?? p.createVector(0, 0);
            const bottomLeft = flowZones[zoneRowBottom]?.[zoneColLeft]?.movement ?? p.createVector(0, 0);
            const bottomRight = flowZones[zoneRowBottom]?.[zoneColRight]?.movement ?? p.createVector(0, 0);

            // Bilinear interpolation
            const interpolatedOffset = p.createVector(
               (1 - xFraction) * (1 - yFraction) * topLeft.x +
               xFraction * (1 - yFraction) * topRight.x +
               (1 - xFraction) * yFraction * bottomLeft.x +
               xFraction * yFraction * bottomRight.x,

               (1 - xFraction) * (1 - yFraction) * topLeft.y +
               xFraction * (1 - yFraction) * topRight.y +
               (1 - xFraction) * yFraction * bottomLeft.y +
               xFraction * yFraction * bottomRight.y
            );

            // TODO scaling value as parameter
            circle.offset = interpolatedOffset.mult(2);
         });
      });
   }


   public draw(b: p5.Graphics): void {
      (b as any).push();
      (b as any).translate(this.x, this.y);
      this.gridCircles.forEach((row) => {
         row.forEach((circle) => {
            circle.draw(b);
         });
      });
      (b as any).pop();
   }
}
