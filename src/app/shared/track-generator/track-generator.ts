import * as seedrandom from "seedrandom";
import { Line } from "./line";
import { Point } from "./point";
import { Track } from "./track";

export class TrackGenerator {
    gateDistance: number = 4;
    minCurve: number = -Math.PI;
    maxCurve: number = Math.PI;
    curveRandomFactor: number = Math.PI / 3;
    maxSegments: number = 100000;
    maxIterations: number = 10000;
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

    private lineLength(line: Line): number {
        const a = line[0][0] - line[1][0];
        const b = line[0][1] - line[1][1];
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

    private lineIntersectionPoint(line1: Line, line2: Line): Point | null {
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
        if (det === 0) return null;

        lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
        gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;

        if (!((0 < lambda && lambda < 1) && (0 < gamma && gamma < 1))) return null;

        return [
            a + lambda * (c - a),
            b + lambda * (d - b),
        ];
    }

    track: Track;
    startGate: Line;
    endGate: Line;
    seed: string;
    random: seedrandom.PRNG;

    constructor(
        track: Track,
        startGate: Line,
        endGate: Line,
        seed: string = '',
    ) {
        this.track = track;
        this.startGate = startGate;
        this.endGate = endGate;

        if (seed === '') seed = ('' + Math.random()).substring(2);
        this.seed = seed;
        this.random = seedrandom(seed);
    }

    private gateNotInBounds(gate: Line): boolean {
        return gate[0][0] < 0 ||
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
                if (this.lineIntersectionPoint(
                    lines[0], lines[1],
                ) !== null) return lines;
                lines[1] = [this.track.gates[i][1], this.track.gates[i - 1][1]];
                if (this.lineIntersectionPoint(
                    lines[0], lines[1],
                ) !== null) return lines;
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

    private calcMaxGateHalfSize(pos: Point, angle: number): number {
        let line = this.pointToGate(pos, angle, this.track.width * this.track.height);
        let minPoint = pos;
        let minDistance = 1000;
        let collision;
        for (let i = this.track.gates.length - 1; i > 1; i--) {
            collision = this.lineIntersectionPoint(
                [line[0], line[1]],
                [this.track.gates[i][0], this.track.gates[i - 1][0]],
            );
            if (collision !== null) {
                const distance = this.lineLength([collision, pos]);
                if (distance < minDistance) {
                    minPoint = collision;
                    minDistance = distance;
                }
            }
            collision = this.lineIntersectionPoint(
                [line[0], line[1]],
                [this.track.gates[i][1], this.track.gates[i - 1][1]],
            );
            if (collision !== null) {
                const distance = this.lineLength([collision, pos]);
                if (distance < minDistance) {
                    minPoint = collision;
                    minDistance = distance;
                }
            }
        }
        // console.log(minDistance);
        // console.log(minPoint);

        return minDistance;
    }

    generate(): number {
        const startTime = new Date().getTime();
        let currentGate = this.startGate;

        const newGates = [];

        let counter = 1;
        while (true) {
            let currentPos = this.gateCenterPos(currentGate);
            let currentAngle = this.gateAngle(currentGate);
            let currentGateHalfSize = this.lineLength(currentGate) / 2;

            let nextAngle = Math.max(
                this.minCurve,
                Math.min(
                    this.maxCurve,
                    currentAngle + (this.random() - 0.5) * this.curveRandomFactor
                ));

            let nextPos = this.pointTravel(currentPos, nextAngle, this.gateDistance);

            let maxNextGateHalfSize = this.calcMaxGateHalfSize(nextPos, nextAngle);

            let nextGateHalfSize = Math.max(
                this.minGateHalfSize,
                Math.min(
                    Math.min(this.maxGateHalfSize, maxNextGateHalfSize),
                    currentGateHalfSize + (this.random() - 0.5) * this.gateHalfSizeRandomFactor,
                ));

            let nextGate = this.pointToGate(nextPos, nextAngle, nextGateHalfSize);

            let collision = this.gateCollision(
                currentGate,
                nextGate,
            );

            if (collision === false) {
                this.track.gates.push(nextGate);
                newGates.push(nextGate);
                if (newGates.length >= this.maxSegments) break;
                currentGate = nextGate;
            }

            counter++;
            if (counter > this.maxIterations) break;
        }

        const generationTime = new Date().getTime() - startTime;

        for (let gate of newGates) {
            this.track.debugDrawGate(gate);
        }

        return generationTime;
    }
}
