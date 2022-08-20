import { Line } from "./line";
import { Point } from "./point";
import { Track } from "./track";

export class TrackGenerator {
    gateDistance: number = 10;
    minCurve: number = -Math.PI;
    maxCurve: number = Math.PI;
    curveRandomFactor: number = Math.PI / 4;
    maxSegments: number = 1000;
    minGateHalfSize: number = 2;
    maxGateHalfSize: number = 5;
    gateHalfSizeRandomFactor: number = 3;

    private gateCenterPos(gate: Line): Point {
        return [
            gate[0][0] + (gate[1][0] - gate[0][0]) * 0.5,
            gate[0][1] + (gate[1][1] - gate[0][1]) * 0.5,
        ];
    }

    private gateAngle(gate: Line): number {
        return Math.atan2(gate[1][1] - gate[0][1], gate[1][0] - gate[0][0]) - Math.PI * 0.5;
    }

    private gateSize(gate: Line): number {
        const a = gate[0][0] - gate[1][0];
        const b = gate[0][1] - gate[1][1];
        return Math.sqrt(a * a + b * b);
    }

    private pointToGate(point: Point, angle: number, halfSize: number): Line {
        return [
            this.pointTravel(point, angle - Math.PI * 0.5, halfSize),
            this.pointTravel(point, angle + Math.PI * 0.5, halfSize),
        ];
    }

    private pointTravel(point: Point, angle: number, distance: number): Point {
        return [point[0] + Math.cos(angle) * distance, point[1] + Math.sin(angle) * distance];
    }

    private lineIntersect(line1: Line, line2: Line): boolean {
        // let a,b,c,d,p,q,r,s = line1[0][0] line1[0][0];
        let a = line1[0][0];
        let b = line1[0][1];
        let c = line1[1][0];
        let d = line1[1][1];
        let p = line2[0][0];
        let q = line2[0][1];
        let r = line2[1][0];
        let s = line2[1][1];
        // returns true if the line from (a,b)->(c,d) intersects with (p,q)->(r,s)
        let det, gamma, lambda;
        det = (c - a) * (s - q) - (r - p) * (d - b);
        if (det === 0) {
            return false;
        } else {
            lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
            gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
            return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
        }
    }

    track: Track;
    startGate: Line;
    endGate: Line;

    constructor(
        track: Track,
        startGate: Line,
        endGate: Line,
    ) {
        this.track = track;
        this.startGate = startGate;
        this.endGate = endGate;
    }

    private gateNotInBounds(gate: Line): boolean {
        return      gate[0][0] < 0 ||
                    gate[0][1] < 0 ||
                    gate[1][0] < 0 ||
                    gate[1][1] < 0 ||
                    gate[0][0] > this.track.width ||
                    gate[1][0] > this.track.width ||
                    gate[0][1] > this.track.height ||
                    gate[1][1] > this.track.height
        ;
    }

    private getTrackCollision(
        currentGate: Line,
        nextGate: Line,
    ): [Line, Line] | null {
        let lines: [Line, Line] = [[[0, 0], [0, 0]], [[0, 0], [0, 0]]];
        for (let connection of [
            [currentGate[0], nextGate[0]],
            [nextGate[0], nextGate[1]],
            [nextGate[1], currentGate[1]],
        ]) {
            for (let i = this.track.gates.length - 1; i > 1; i--) {
                lines[0] = [connection[0], connection[1]];
                lines[1] = [this.track.gates[i][0], this.track.gates[i - 1][0]];
                if (this.lineIntersect(
                    lines[0], lines[1],
                )) return lines;
                lines[1] = [this.track.gates[i][1], this.track.gates[i - 1][1]];
                if (this.lineIntersect(
                    lines[0], lines[1],
                )) return lines;
            }
        }
        return null;
    }

    private gateCollision(
        currentGate: Line,
        nextGate: Line,
    ): boolean | [Line, Line] {
        if (this.gateNotInBounds(nextGate)) return true;

        const collision = this.getTrackCollision(
            currentGate,
            nextGate,
        );
        if (collision === null) return false;
        return collision;
    }

    private generateNextGate(
        currentGate: Line,
    ): Line {
        let missingGates = 0;
        let trys = 0;
        // while (true) {
        for (let test = 0; test < 100; test++) {

            let currentPos = this.gateCenterPos(currentGate);
            let currentAngle = this.gateAngle(currentGate);
            let currentGateHalfSize = this.gateSize(currentGate) / 2;

            let nextAngle = Math.max(
                this.minCurve,
                Math.min(
                    this.maxCurve,
                    currentAngle + (Math.random() - 0.5) * this.curveRandomFactor
                ));

            let nextGateHalfSize = Math.max(
                this.minGateHalfSize,
                Math.min(
                    this.maxGateHalfSize,
                    currentGateHalfSize + (Math.random() - 0.5) * this.gateHalfSizeRandomFactor,
                ));

            let nextPos = this.pointTravel(currentPos, nextAngle, this.gateDistance);

            let nextGate = this.pointToGate(nextPos, nextAngle, nextGateHalfSize);

            let collision = this.gateCollision(
                currentGate,
                nextGate,
            );

            if (collision === false) {
                this.track.gates.push(nextGate);
                if (missingGates == 0) return nextGate;
                trys = 0;
                missingGates--;
                currentGate = this.track.lastGate();
            } else {
                trys++;
            }

            if (trys > 5) {
                trys = 0;
                this.track.gates.pop();
                missingGates++;
                currentGate = this.track.lastGate();
            }
        }
        console.log('exceeded computation');
        return currentGate;
    }

    generate() {

        const startTime = new Date().getTime();
        let currentGate = this.startGate;

        for (let i = 0; i < this.maxSegments; i++) {

            let nextGate = this.generateNextGate(
                currentGate,
            );

            currentGate = nextGate;
        }

        console.log(new Date().getTime() - startTime + ' ms');

        for (let gate of this.track.gates) {
            this.track.debugDrawGate(gate);
        }
    }
}
