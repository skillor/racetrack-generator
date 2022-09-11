import { Drawer } from "./drawer";
import { Line } from "./line";
import { Math2D } from "./math2d";
import { Point } from "./point";

export class Track {
    width: number;
    height: number;
    collisions: boolean[][];
    gates: Line[];
    drivePath?: [number, number, number][] = undefined;
    barrierLines?: {left: Line[], right: Line[]} = undefined;
    deletedBarriers: number[];

    constructor(
        width: number,
        height: number,
        collisions: boolean[][],
        gates: Line[],
        deletedBarriers: number[] = [],
    ) {
        this.width = width;
        this.height = height;

        this.collisions = collisions;

        this.gates = gates;
        this.deletedBarriers = deletedBarriers;
    }

    serialize(): string {
        return JSON.stringify({ width: this.width, height: this.height, collisions: this.collisions, gates: this.gates, deletedBarriers: this.deletedBarriers });
    }

    static unserialize(json: string): Track {
        const obj = JSON.parse(json);
        return new Track(obj.width, obj.height, obj.collisions, obj.gates, obj.deletedBarriers);
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

    private calculateDrivePath() {
        this.drivePath = [];
        for (let i = 0; i < this.gates.length; i++) {
            const pos = Math2D.centerOfLine(this.gates[i]);
            this.drivePath.push([pos[0], pos[1], Math2D.lineLength(this.gates[i]) / 2]);
        }
    }

    getDrivePath(): [number, number, number][] {
        if (this.drivePath === undefined) this.calculateDrivePath();
        return this.drivePath!;
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
        leftColor: string = '#fff',
        rightColor: string | null = null,
        leftLineWidth: number = 1,
        rightLineWidth: number | null = null,
    ) {
        if (rightColor === null) rightColor = leftColor;
        if (rightLineWidth === null) rightLineWidth = leftLineWidth;
        const barriers = this.getBarrierLines();
        for (let i = 0; i < barriers.left.length; i++) {
            if (!this.deletedBarriers.includes(i * 2)) Drawer.drawLine(context, barriers.left[i], leftColor, leftLineWidth);
        }

        for (let i = 0; i < barriers.right.length; i++) {
            if (!this.deletedBarriers.includes(i * 2 + 1)) Drawer.drawLine(context, barriers.right[i], rightColor, rightLineWidth);
        }
    }

    drawDrivePath(
        context: any | null,
        color: string = '#fff',
        lineWidth: number = 1,
    ) {
        const drivePath = this.getDrivePath();
        for (let i = 0; i < drivePath.length - 1; i++) {
            Drawer.drawLine(context, [drivePath[i], drivePath[i+1]], color, lineWidth);
        }
    }

    clearContext(ctx: any | null) {
        if (ctx === null) return;
        ctx.clearRect(0, 0, this.width, this.height);
    }

    drawTrack(ctx: any | null, off: number = 0, n: number = -1): void {
        if (ctx === null) return;
        this.clearContext(ctx);

        this.drawBarrierLines(ctx, '#ff0', '#ff0', 1, 1);

        this.drawDrivePath(ctx, '#00f', 1);

        if (n < 0) n = this.gates.length;

        if (n == 0) return;

        Drawer.drawGateArrow(ctx, this.firstGate(), 10, '#0f0');
        Drawer.drawGateArrow(ctx, this.lastGate(), -10, '#f00');

        // for (let i = off; i < n; i++) {
        //     Drawer.drawGate(ctx, this.gates[i], '#fff', '#fff');
        // }
    }
}
