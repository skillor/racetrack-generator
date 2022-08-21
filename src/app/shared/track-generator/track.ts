import { Line } from "./line";
import { Point } from "./point";

export class Track {
    width: number;
    height: number;
    debugCanvasContext: CanvasRenderingContext2D | null = null;
    trackCanvasContext: CanvasRenderingContext2D;
    gates: Line[];

    drawPoint(context: CanvasRenderingContext2D | null, point: Point, color: string = '#fff') {
        if (context === null) return;

        context.fillStyle = color;
        context.fillRect(point[0] - 1, point[1] - 1, 2, 2);
    }

    drawGate(context: CanvasRenderingContext2D | null, gate: Line, leftColor = '#f00', rightColor = '#0f0') {
        if (context === null) return;

        this.drawPoint(context, gate[0], leftColor);
        this.drawPoint(context, gate[1], rightColor);
    }

    drawLine(context: CanvasRenderingContext2D | null, line: Line, color = '#f00') {
        if (context === null) return;

        context.strokeStyle = color;

        context.beginPath();

        context.moveTo(line[0][0], line[0][1]);
        context.lineTo(line[1][0], line[1][1]);

        context.stroke();
    }

    constructor(
        width: number,
        height: number,
        debugCanvas: HTMLCanvasElement | null = null,
        trackCanvas: HTMLCanvasElement,
        gates: Line[],
    ) {
        this.width = width;
        this.height = height;

        this.trackCanvasContext = trackCanvas.getContext("2d")!;

        if (debugCanvas !== null) this.debugCanvasContext = debugCanvas.getContext("2d");

        this.gates = gates;
    }

    firstGate(): Line {
        return this.gates[0];
    }

    lastGate(): Line {
        return this.gates[this.gates.length - 1];
    }

    deleteLastGates(n: number): void {
        this.gates.splice(this.gates.length - n, n);
    }

    drawTrack(off: number = 0, n: number = -1): void {
        // this.trackCanvasContext.clearRect(0, 0, this.width, this.height);
        // this.trackCanvasContext.fillStyle = '#fff';
        this.trackCanvasContext.clearRect(0, 0, this.width, this.height);

        if (n < 0) n = this.gates.length;
        for (let i = off; i < n; i++) {
            this.drawGate(this.trackCanvasContext, this.gates[i]);
        }
    }
}
