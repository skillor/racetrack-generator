import { fromEvent, map, Observable, of } from "rxjs";
import * as seedrandom from "seedrandom";
import { GeneratorMode } from "./generator-modes";
import { Line } from "./line";
import { Point } from "./point";
import { Settings } from "./settings";
import { Track } from "./track";

export class TrackGenerator {
    settings: Settings;
    TWO_PI = Math.PI * 2;

    private pointEquals(point1: Point, point2: Point): boolean {
        return point1[0] == point2[0] && point1[1] == point2[1];
    }

    private lineEqualsStrict(line1: Line, line2: Line): boolean {
        return this.pointEquals(line1[0], line2[0]) && this.pointEquals(line1[1], line2[1]);
    }

    private gateCenterPos(gate: Line): Point {
        return [
            gate[0][0] + (gate[1][0] - gate[0][0]) * 0.5,
            gate[0][1] + (gate[1][1] - gate[0][1]) * 0.5,
        ];
    }

    private normalizeAngle(angle: number): number {
        // normalize between -π and +π
        return angle - this.TWO_PI * Math.floor((angle + Math.PI) / this.TWO_PI)
    }

    private normalizeAngle10(angle: number): number {
        // normalize between 0 and 1
        return (angle + Math.PI) / this.TWO_PI;
    }

    private vectorAngle(vector: Point): number {
        return Math.atan2(vector[1], vector[0])
    }

    private angleToVector(angle: number): Point {
        return [Math.cos(angle), Math.sin(angle)];
    }

    private angleToVectorMultiplied(angle: number, distance: number): Point {
        return [Math.cos(angle) * distance, Math.sin(angle) * distance];
    }

    private lineAngle(line: Line): number {
        return this.vectorAngle([line[1][0] - line[0][0], line[1][1] - line[0][1]]);
    }

    private gateAngle(gate: Line): number {
        return this.normalizeAngle(this.lineAngle(gate) - Math.PI * 0.5);
    }

    private lineLengthUnnormed(line: Line): number {
        const a = line[0][0] - line[1][0];
        const b = line[0][1] - line[1][1];
        return a * a + b * b;
    }

    private lineLength(line: Line): number {
        return Math.sqrt(this.lineLengthUnnormed(line));
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

    private pointOutBounds(point: Point): boolean {
        return point[0] < 0 ||
            point[1] < 0 ||
            point[0] > this.track.width ||
            point[1] > this.track.height;
    }

    private lineOutBounds(line: Line): boolean {
        return this.pointOutBounds(line[0]) || this.pointOutBounds(line[1]);
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
        // returns point if the line from (a,b)->(c,d) intersects with (p,q)->(r,s)
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

    private gateHasCollision(currentGate: Line, newGate: Line, gates: Line[]): boolean {
        if (this.lineOutBounds(newGate)) return true;
        for (let connection of [
            [currentGate[0], newGate[0]],
            [newGate[0], newGate[1]],
            [newGate[1], currentGate[1]],
        ]) {
            const currentGates = this.track.gates.concat(gates);
            for (let i = currentGates.length - 1; i > 1; i--) {
                for (let j of [0, 1] as (0 | 1)[]) {
                    if (this.lineIntersectionPoint(
                        [connection[0], connection[1]], [currentGates[i][j], currentGates[i - 1][j]],
                    ) !== null) return true;
                }
            }
        }
        return false;
    }

    track: Track;
    startGate: Line;
    endGate: Line;
    seed: string;
    random: seedrandom.PRNG;
    mode: GeneratorMode;

    constructor(
        track: Track,
        startGate: Line,
        endGate: Line,
        mode: GeneratorMode = 'random',
        seed: string = '',
        settings: Settings = new Settings(),
    ) {
        this.track = track;
        this.startGate = startGate;
        this.endGate = endGate;
        this.mode = mode;
        this.settings = settings;

        if (seed === '') seed = ('' + Math.random()).substring(2);
        this.seed = seed;
        this.random = seedrandom(seed);
    }

    serialize(): string {
        return JSON.stringify({
            track: this.track.serialize(),
            start: this.startGate,
            end: this.endGate,
            mode: this.mode,
            seed: this.seed,
            settings: this.settings.serialize(),
        });
    }

    static unserialize(json: string): TrackGenerator {
        const obj = JSON.parse(json);
        return new TrackGenerator(
            Track.unserialize(obj.track),
            obj.start,
            obj.end,
            obj.mode,
            obj.seed,
            Settings.unserialize(obj.settings),
        );
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

        return minDistance;
    }

    private predictDirections(startPos: Point, targetPos: Point, currentAngle: number): Point[] {

        const targetAngle = this.lineAngle([startPos, targetPos]);
        const wantedAngle = this.normalizeAngle(targetAngle - currentAngle);

        const angles: number[] = [
            this.normalizeAngle(currentAngle)
        ];

        for (let i = this.settings.curveComputeCount - 1; i > 0; i--) {
            angles.push(
                this.normalizeAngle(currentAngle + ((i * this.settings.maxCurve) / this.settings.curveComputeCount))
            );
            angles.push(
                this.normalizeAngle(currentAngle - ((i * this.settings.maxCurve) / this.settings.curveComputeCount))
            );
        }

        angles.sort((a, b) => {
            return (wantedAngle - a) - (wantedAngle - b);
        });

        const vectors: Point[] = [];

        for (const angle of angles) {
            vectors.push(
                this.angleToVectorMultiplied(angle, this.settings.gateDistance)
            );
        }

        return vectors;
    }

    private randomShuffle(a: Point[]): Point[] {
        return a.sort(() => 0.5 - this.random());;
    }

    private pointAngleMatches(point1: Point, angle1: number, point2: Point, angle2: number): boolean {
        const d = this.lineLengthUnnormed([point1, point2]);
        if (d > 10) return false;
        const k = Math.abs(this.normalizeAngle(angle1 - angle2));
        if (k > 0.1) return false;
        return true;
    }

    private posAngleToGrid(pos: Point, angle: number): [number, number, number] {
        return [
            Math.floor(pos[1] * this.settings.yComputeFactor),
            Math.floor(pos[0] * this.settings.xComputeFactor),
            Math.floor(this.normalizeAngle10(angle) * this.settings.angleComputeFactor)
        ];
    }

    private isValidGridPos(gridPos: [number, number, number], gridSize: [number, number, number]): boolean {
        return gridPos[0] >= 0 && gridPos[0] < gridSize[0] &&
            gridPos[1] >= 0 && gridPos[1] < gridSize[1] &&
            gridPos[2] >= 0 && gridPos[2] < gridSize[2];
    }

    findTrackDFS(iterationCount = 0, trys = 0): [Line[], boolean, number] {
        const gates: [Line, Line[]][] = [];

        const endPos = this.gateCenterPos(this.endGate);
        const endAngle = this.gateAngle(this.endGate);

        const gridSize = this.posAngleToGrid([this.track.width, this.track.height], Math.PI);

        console.log(gridSize);

        const visited: boolean[][][] = new Array<boolean[][]>(gridSize[0]);

        for (let y = 0; y < gridSize[0]; y++) {
            visited[y] = new Array<boolean[]>(gridSize[1]);
            for (let x = 0; x < gridSize[1]; x++) {
                visited[y][x] = new Array<boolean>(gridSize[2]);
                for (let a = 0; a < gridSize[2]; a++) {
                    visited[y][x][a] = false;
                }
            }
        }

        gates.push([this.startGate, []]);

        while (true) {
            let current = gates.pop();
            if (current === undefined) {
                this.settings.angleComputeFactor += 1;
                if (trys > this.settings.maxTrys) return [[], false, iterationCount];
                return this.findTrackDFS(iterationCount, trys + 1);
            };
            const currentGate = current[0];
            const traversedGates = current[1];

            const currentPos = this.gateCenterPos(currentGate);
            const currentAngle = this.gateAngle(currentGate);

            const currentGridPos = this.posAngleToGrid(currentPos, currentAngle);
            visited[currentGridPos[0]][currentGridPos[1]][currentGridPos[2]] = true;

            const foundEnd = this.pointAngleMatches(currentPos, currentAngle, endPos, endAngle);
            if (foundEnd ||
                traversedGates.length > this.settings.maxSegments) {
                return [traversedGates, foundEnd, iterationCount];
            }

            let diretions = this.predictDirections(currentPos, endPos, currentAngle);
            switch (this.mode) {
                case 'worst':
                    diretions = diretions.reverse();
                    break;
                case 'random':
                    diretions = this.randomShuffle(diretions);
                    break;
            }

            for (let d of diretions) {
                const newPos: Point = [currentPos[0] + d[0], currentPos[1] + d[1]];

                const newAngle = this.vectorAngle(d);
                const newGate = this.pointToGate(newPos, newAngle, this.settings.minGateHalfSize);

                const newGridPos = this.posAngleToGrid(newPos, newAngle);

                if (this.isValidGridPos(newGridPos, gridSize) &&
                    !visited[newGridPos[0]][newGridPos[1]][newGridPos[2]] &&
                    !this.gateHasCollision(currentGate, newGate, traversedGates)) {

                    gates.push([newGate, traversedGates.concat([currentGate])]);
                }
            }

            iterationCount++;
            if (iterationCount > this.settings.maxIterations) return [[], false, iterationCount];
        }
    }

    generate(): [number, number] {
        const startTime = new Date().getTime();

        const solution = this.findTrackDFS();

        const generationTime = new Date().getTime() - startTime;

        if (solution[0].length == 0) {
            console.log('path was not found!');
            return [generationTime, solution[2]];
        }

        const gates = solution[0];
        if (solution[1]) console.log('path is finished');

        const n = gates.length;

        for (let i = 0; i < n; i++) {
            if (i > 0) this.track.gates.push(gates[i]);

            if (i > 0) this.track.drawGate(this.track.debugCanvasContext, gates[i]);
            // this.track.drawLine(this.track.debugCanvasContext, [this.gridPostoPos(path[i]), this.gridPostoPos(path[i - 1])]);
        }

        return [generationTime, solution[2]];
    }

    private findTrackDFSWorker(): Observable<[Line[], boolean, number]> {
        if (typeof Worker !== 'undefined') {
            // Create a new
            const worker = new Worker(new URL('./track-generator.worker', import.meta.url));
            const subscribtion = fromEvent(worker, 'message').pipe(
                map((event: any) => {
                    return event.data;
                })
            );
            worker.postMessage(this.serialize());
            return subscribtion;
        } else {
            // Web Workers are not supported in this environment.
            // You should add a fallback so that your program still executes correctly.
            return of(this.findTrackDFS());
        }
    }

    workerGenerate(): Observable<[number, number]> {
        const startTime = new Date().getTime();

        return this.findTrackDFSWorker().pipe(
            map((solution) => {
                const generationTime = new Date().getTime() - startTime;

                if (solution[0].length == 0) {
                    console.log('path was not found!');
                    return [generationTime, solution[2]];
                }

                const gates = solution[0];
                if (solution[1]) console.log('path is finished');

                const n = gates.length;

                for (let i = 0; i < n; i++) {
                    if (i > 0) this.track.gates.push(gates[i]);

                    if (i > 0) this.track.drawGate(this.track.debugCanvasContext, gates[i]);
                    // this.track.drawLine(this.track.debugCanvasContext, [this.gridPostoPos(path[i]), this.gridPostoPos(path[i - 1])]);
                }

                return [generationTime, solution[2]];
            })
        );
    }
}
