import p5 from "p5";
import { GridCell, GridCellMode } from "./grid_cell";
import { FlowZone } from "./flow";

export class Grid {
   // rows x columns
   gridCells: GridCell[][] = [];

   constructor(
      public p: p5,
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
         this.gridCells[row] = [];
         for (let col = 0; col < cols; col++) {
            let relX = gridCellSize / 2 + col * gridCellSize;
            this.gridCells[row][col] = new GridCell(this, new p5.Vector(relX, relY));
         }
      }
   }

   // Returns the global movement -- that is the total sum of magnitudes of all flows in the image
   public update(flowZones: FlowZone[][]): number {
      let globalMovement = 0;

      // Dimensions of the flow zone grid
      const flowZoneRows = flowZones.length;
      const flowZoneCols = flowZones[0]?.length || 0;

      this.gridCells.forEach((row) => {
         row.forEach((cell) => {
            // Map grid position to flow zone indices
            let mappedX = this.p.map(cell.position.x, 0, this.width, 0, flowZoneCols);
            let mappedY = this.p.map(cell.position.y, 0, this.height, 0, flowZoneRows);

            // Indices for the four surrounding zones
            let zoneColLeft = Math.floor(mappedX);
            let zoneColRight = Math.min(zoneColLeft + 1, flowZoneCols - 1);
            let zoneRowTop = Math.floor(mappedY);
            let zoneRowBottom = Math.min(zoneRowTop + 1, flowZoneRows - 1);

            // Interpolation weights
            let xFraction = mappedX - zoneColLeft;
            let yFraction = mappedY - zoneRowTop;

            // Neighboring FlowZones, ensuring they exist
            const topLeft = flowZones[zoneRowTop]?.[zoneColLeft]?.movement ?? this.p.createVector(0, 0);
            const topRight = flowZones[zoneRowTop]?.[zoneColRight]?.movement ?? this.p.createVector(0, 0);
            const bottomLeft = flowZones[zoneRowBottom]?.[zoneColLeft]?.movement ?? this.p.createVector(0, 0);
            const bottomRight = flowZones[zoneRowBottom]?.[zoneColRight]?.movement ?? this.p.createVector(0, 0);

            // Bilinear interpolation
            const interpolatedOffset = this.p.createVector(
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
            globalMovement += interpolatedOffset.mag();
            cell.update(interpolatedOffset);
         });
      });
      return globalMovement;
   }


   public draw(mode: GridCellMode, backgroundColor: p5.Color, mainColor: p5.Color, canvas: p5.Graphics): void {
      (canvas as any).push();
      (canvas as any).translate(this.x, this.y);
      this.gridCells.forEach((row) => {
         row.forEach((circle) => {
            circle.draw(mode, backgroundColor, mainColor, canvas);
         });
      });
      (canvas as any).pop();
   }
}
