import { Line } from "./line";
import { Point } from "./point";
import { TrackGenerator } from "./track-generator";

export class Track {
    width: number;
    height: number;
    collisions: boolean[][];
    debugCanvasContext: any | null = null;
    trackCanvasContext: any | null = null;
    gates: Line[];
    barrierLines?: {left: Line[], right: Line[]} = undefined;
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
        context.lineWidth = 1;

        context.beginPath();

        context.moveTo(line[0][0], line[0][1]);
        context.lineTo(line[1][0], line[1][1]);

        context.closePath();

        context.stroke();
    }

    static drawPolygon(
        context: any | null,
        points: Point[],
        fillColor: string | null = '#fff',
        strokeColor: string | null = null,
    ) {
        if (context === null) return;
        if (points.length == 0) return;

        if (fillColor !== null) context.fillStyle = fillColor;
        if (strokeColor !== null) {
            context.strokeStyle = strokeColor;
            context.lineWidth = 1;
        }

        context.beginPath();

        context.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            context.lineTo(points[i][0], points[i][1]);
        }
        context.lineTo(points[0][0], points[0][1]);

        context.closePath();

        if (fillColor !== null) context.fill();
        if (strokeColor !== null) context.stroke();
    }

    static drawGateArrow(
        context: any | null,
        gate: Line,
        size: number,
        color: string = '#fff',
    ) {
        if (context === null) return;
        context.strokeStyle = color;
        context.lineWidth = 1;

        let angle = TrackGenerator.gateAngle(gate);

        let start = TrackGenerator.centerOfLine(gate);
        let v = TrackGenerator.angleToVectorMultiplied(angle, size);
        let end: Point = [start[0] + v[0], start[1] + v[1]];
        if (size < 0) {
            let t = start;
            start = end;
            end = t;
            angle += Math.PI;
        }

        context.beginPath();

        context.moveTo(start[0], start[1]);
        context.lineTo(end[0], end[1]);
        v = TrackGenerator.angleToVectorMultiplied(angle + 0.3, size * 0.8);
        context.lineTo(start[0] + v[0], start[1] + v[1]);

        context.moveTo(end[0], end[1]);

        v = TrackGenerator.angleToVectorMultiplied(angle - 0.3, size * 0.8);
        context.lineTo(start[0] + v[0], start[1] + v[1]);

        context.closePath();

        context.stroke();
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

    private calculateBarrierLines() {
        this.barrierLines = {left: [], right: []};
        for (let i = this.gates.length - 1; i > 1; i--) {
            for (let j of [0, 1] as (0 | 1)[]) {
                let lines = this.barrierLines.left;
                if (j == 1) lines = this.barrierLines.right;
                lines.push([
                    this.gates[i][j],
                    this.gates[i - 1][j],
                ]);
            }
        }
    }

    getBarrierLines(): {left: Line[], right: Line[]} {
        if (this.barrierLines === undefined) this.calculateBarrierLines();
        return this.barrierLines!;
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

    drawBarrierLines(
        context: any | null,
        color: string = '#fff',
    ) {
        const barriers = this.getBarrierLines();
        for (let i = 0; i < barriers.left.length; i++) {
            if (!this.deletedBarriers.includes(i * 2)) Track.drawLine(context, barriers.left[i], color);
        }

        for (let i = 0; i < barriers.right.length; i++) {
            if (!this.deletedBarriers.includes(i * 2 + 1)) Track.drawLine(context, barriers.right[i], color);
        }
    }

    drawTrack(off: number = 0, n: number = -1): void {
        if (this.trackCanvasContext === null) return;
        this.trackCanvasContext.clearRect(0, 0, this.width, this.height);

        Track.drawGateArrow(this.trackCanvasContext, this.firstGate(), 10, '#0f0');
        Track.drawGateArrow(this.trackCanvasContext, this.lastGate(), -10, '#f00');

        if (n < 0) n = this.gates.length;

        this.drawBarrierLines(this.trackCanvasContext, '#fff');

        for (let i = off; i < n; i++) {
            Track.drawGate(this.trackCanvasContext, this.gates[i]);
        }
    }
}
