import { Line } from "./line";
import { Point } from "./point";

export class Track {
    width: number;
    height: number;
    collisions: boolean[][];
    debugCanvasContext: any | null = null;
    trackCanvasContext: any | null = null;
    gates: Line[];
    deletedBarriers: number[];

    static drawPoint(context: any | null, point: Point, color: string = '#fff') {
        if (context === null) return;

        context.fillStyle = color;
        context.fillRect(point[0] - 1, point[1] - 1, 2, 2);
    }

    static drawGate(context: any | null, gate: Line, leftColor = '#f00', rightColor = '#0f0') {
        if (context === null) return;

        this.drawPoint(context, gate[0], leftColor);
        this.drawPoint(context, gate[1], rightColor);
    }

    static drawLine(context: any | null, line: Line, color = '#f00') {
        if (context === null) return;

        context.strokeStyle = color;

        context.beginPath();

        context.moveTo(line[0][0], line[0][1]);
        context.lineTo(line[1][0], line[1][1]);

        context.closePath();

        context.stroke();
    }

    static drawPolygon(
        context: any | null,
        points: Point[],
        fillColor: string | undefined = '#fff',
        strokeColor: string | undefined = '#fff',
    ) {
        if (context === null) return;
        if (points.length == 0) return;

        if (fillColor !== undefined) context.fillStyle = fillColor;
        if (strokeColor !== undefined) context.strokeStyle = strokeColor;

        context.beginPath();

        context.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            context.lineTo(points[i][0], points[i][1]);
        }
        context.lineTo(points[0][0], points[0][1]);

        context.closePath();

        if (fillColor !== undefined) context.fill();
        if (strokeColor !== undefined) context.stroke();
    }

    constructor(
        width: number,
        height: number,
        collisions: boolean[][],
        debugCanvas: any | null = null,
        trackCanvas: any | null = null,
        gates: Line[],
        deletedBarriers: number[] = [],
    ) {
        this.width = width;
        this.height = height;

        this.collisions = collisions;
        if (trackCanvas !== null) this.trackCanvasContext = trackCanvas.getContext("2d");
        if (debugCanvas !== null) this.debugCanvasContext = debugCanvas.getContext("2d");

        this.gates = gates;
        this.deletedBarriers = deletedBarriers;
    }

    serialize(): string {
        return JSON.stringify({ width: this.width, height: this.height, collisions: this.collisions, gates: this.gates, deletedBarriers: this.deletedBarriers });
    }

    static unserialize(json: string): Track {
        const obj = JSON.parse(json);
        return new Track(obj.width, obj.height, obj.collisions, null, null, obj.gates, obj.deletedBarriers);
    }

    getBarrierLines(off: number = 0, n: number = -1): Line[] {
        if (n < 0) n = this.gates.length;
        const lines: Line[] = [];
        for (let i = n - 1; i > off + 1; i--) {
            for (let j of [0, 1] as (0 | 1)[]) {
                if (!this.deletedBarriers.includes((i - 1) * 2 + j)) {
                    lines.push([
                        this.gates[i][j],
                        this.gates[i - 1][j],
                    ]);
                }
            }
        }
        return lines;
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
        if (this.trackCanvasContext === null) return;
        this.trackCanvasContext.clearRect(0, 0, this.width, this.height);

        if (n < 0) n = this.gates.length;

        for (let b of this.getBarrierLines(off, n)) {
            Track.drawLine(this.trackCanvasContext, b, '#fff');
        }

        for (let i = off; i < n; i++) {
            Track.drawGate(this.trackCanvasContext, this.gates[i]);
        }
    }
}
