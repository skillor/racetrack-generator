import { Line } from "./line";
import { Point } from "./point";

export class Track {
    width: number;
    height: number;
    debugCanvasContext: CanvasRenderingContext2D | null = null;
    trackCanvasContext: CanvasRenderingContext2D;
    gates: Line[];

    debugDrawPoint(point: Point, color: string = '#fff') {
        if (this.debugCanvasContext === null) return;

        this.debugCanvasContext.fillStyle = color;
        this.debugCanvasContext.fillRect(point[0] - 1, point[1] - 1, 2, 2);
    }

    debugDrawGate(gate: Line, leftColor = '#f00', rightColor = '#0f0') {
        if (this.debugCanvasContext === null) return;

        this.debugDrawPoint(gate[0], leftColor);
        this.debugDrawPoint(gate[1], rightColor);
    }

    debugDrawLine(line: Line, color = '#f00') {
        if (this.debugCanvasContext === null) return;

        this.debugCanvasContext.strokeStyle = color;

        this.debugCanvasContext.beginPath();

        this.debugCanvasContext.moveTo(line[0][0], line[0][1]);
        this.debugCanvasContext.lineTo(line[1][0], line[1][1]);

        this.debugCanvasContext.stroke();
    }

    constructor(
        debugCanvas: HTMLCanvasElement | null = null,
        trackCanvas: HTMLCanvasElement,
        gates: Line[],
    ) {
        if (gates.length == 0) throw new Error('needs min 1 gate to start');

        this.width = trackCanvas.width;
        this.height = trackCanvas.height;
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
}
