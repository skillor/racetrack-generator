import { fromEvent, map, Observable, of, take } from "rxjs";
import * as seedrandom from "seedrandom";
import { GeneratorMode } from "./generator-modes";
import { Line } from "./line";
import { Point } from "./point";
import { Rect } from "./rectangle";
import { Settings } from "./settings";
import { Track } from "./track";

export class TrackGenerator {
    settings: Settings;
    static TWO_PI = Math.PI * 2;

    static colorMatch(color1: Uint8ClampedArray, color2: Uint8ClampedArray): boolean {
        return color1[0] == color2[0] &&
            color1[1] == color2[1] &&
            color1[2] == color2[2];
    }

    static pointEquals(point1: number[], point2: number[]): boolean {
        return point1[0] == point2[0] && point1[1] == point2[1];
    }

    static lineEqualsStrict(line1: Line, line2: Line): boolean {
        return this.pointEquals([line1[0][0], line1[0][1]], [line2[0][0], line2[0][1]]) && this.pointEquals([line1[1][0], line1[1][1]], [line2[1][0], line2[1][1]]);
    }

    private gateCenterPos(gate: Line): Point {
        return [
            gate[0][0] + (gate[1][0] - gate[0][0]) * 0.5,
            gate[0][1] + (gate[1][1] - gate[0][1]) * 0.5,
        ];
    }

    private degreesToRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    static normalizeAngle(angle: number): number {
        // normalize between -π and +π
        return angle - this.TWO_PI * Math.floor((angle + Math.PI) / this.TWO_PI)
    }

    static normalizeAngle10(angle: number): number {
        // normalize between 0 and 1
        return (angle + Math.PI) / this.TWO_PI;
    }

    static vectorAngle(vector: Point): number {
        return Math.atan2(vector[1], vector[0])
    }

    static angleToVector(angle: number): Point {
        return [Math.cos(angle), Math.sin(angle)];
    }

    static angleToVectorMultiplied(angle: number, distance: number): Point {
        return [Math.cos(angle) * distance, Math.sin(angle) * distance];
    }

    static lineAngle(line: Line): number {
        return this.vectorAngle([line[1][0] - line[0][0], line[1][1] - line[0][1]]);
    }

    static gateAngle(gate: Line): number {
        return this.normalizeAngle(this.lineAngle(gate) - Math.PI * 0.5);
    }

    static rotatePoint(p: Point, angle: number): Point {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [cos * p[0] - sin * p[1], sin * p[0] + cos * p[1]];
    }

    static addPoints(p1: Point, p2: Point): Point {
        return [p1[0] + p2[0], p1[1] + p2[1]];
    }

    static rotatedRect(pos: Point, halfSize: Point, angle: number): Point[] {
        return [
            this.addPoints(pos, this.rotatePoint(halfSize, angle)),
            this.addPoints(pos, this.rotatePoint([halfSize[0], -halfSize[1]], angle)),
            this.addPoints(pos, this.rotatePoint([-halfSize[0], -halfSize[1]], angle)),
            this.addPoints(pos, this.rotatePoint([-halfSize[0], halfSize[1]], angle)),
        ];
    }

    static lineLengthUnnormed(line: Line): number {
        const a = line[0][0] - line[1][0];
        const b = line[0][1] - line[1][1];
        return a * a + b * b;
    }

    static lineLength(line: Line): number {
        return Math.sqrt(this.lineLengthUnnormed(line));
    }

    static pointToGate(point: Point, angle: number, halfSize: number, round: boolean = false): Line {

        return [
            this.pointTravel(point, angle - Math.PI * 0.5, halfSize, round),
            this.pointTravel(point, angle + Math.PI * 0.5, halfSize, round),
        ];
    }

    private static pointTravel(point: Point, angle: number, distance: number, round: boolean = false): Point {
        const p: Point = [point[0] + Math.cos(angle) * distance, point[1] + Math.sin(angle) * distance];
        if (round) {
            p[0] = Math.round(p[0]);
            p[1] = Math.round(p[1]);
        }
        return p;
    }

    private boundsLines(): Line[] {
        return [
            [[0, 0], [this.track.width, 0]],
            [[0, 0], [0, this.track.height]],
            [[this.track.width, this.track.height], [this.track.width, 0]],
            [[this.track.width, this.track.height], [0, this.track.height]],
        ]
    }

    private pointOutBounds(point: Point): boolean {
        return point[0] < 0 ||
            point[1] < 0 ||
            point[0] > this.track.width ||
            point[1] > this.track.height;
    }

    static centerOfLine(line: Line): Point {
        return [(line[0][0] + line[1][0]) * 0.5, (line[0][1] + line[1][1]) * 0.5];
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
        const next: Line[] = [
            [currentGate[0], newGate[0]],
            [newGate[0], newGate[1]],
            [newGate[1], currentGate[1]],
        ];

        if (this.hasPolyPixelCollision([
            currentGate[0],
            newGate[0],
            newGate[1],
            currentGate[1],
        ])) return true;

        for (let connection of next) {
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

    private getLineBounds(l: Line): Rect {
        return [
            Math.min(l[0][1], l[1][1]),
            Math.min(l[0][0], l[1][0]),
            Math.max(l[0][0], l[1][0]),
            Math.max(l[0][1], l[1][1]),
        ];

    }

    private getLinesBounds(lines: Line[]): Rect {
        let top = Infinity, left = Infinity;
        let right = -Infinity, bottom = -Infinity;
        for (const l of lines) {
            top = Math.min(top, l[0][1], l[1][1]);
            left = Math.min(left, l[0][0], l[1][0]);
            right = Math.max(right, l[0][0], l[1][0]);
            bottom = Math.max(bottom, l[0][1], l[1][1]);
        }
        return [
            top,
            left,
            right,
            bottom,
        ];
    }

    private hasRectangleCollision(rect1: Rect, rect2: Rect): boolean {
        return rect1[1] < rect2[2] &&
            rect1[2] > rect2[1] &&
            rect1[0] < rect2[3] &&
            rect1[3] > rect2[0];
    }

    private lineIsValidY(y: number, line: Line): boolean {
        if (y >= line[0][1] && y < line[1][1]) return true;
        if (y >= line[1][1] && y < line[0][1]) return true;
        return false;
    }

    private lineGetM(line: Line): number {
        return (line[1][1] - line[0][1]) / (line[1][0] - line[0][0]);
    }

    private lineGetX(y: number, line: Line): number {
        return 1 / this.lineGetM(line) * (y - line[0][1]) +  line[0][0];
    }

    private getLinesMeetY(y: number, lines: Line[]): number[] {
        let meet: number[] = [];
        for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            if (this.lineIsValidY(y, l)) {
                meet.push(this.lineGetX(y, l));
            }
        }

        //sort
        // meet.sort();
        for (let i = 0; i < meet.length; i++)
            for (let j = i; j < meet.length; j++) {
                if (meet[i] > meet[j]) {
                    let temp = meet[i];
                    meet[i] = meet[j];
                    meet[j] = temp;
                }
            }

        return  meet;
    }

    hasPolyPixelCollision(points: Point[]): boolean {
        const lines: Line[] = [];

        for (let i = 1; i < points.length; i++) {
            lines.push([points[i - 1], points[i]]);
        }
        lines.push([points[points.length - 1], points[0]]);

        const b = this.getLinesBounds(lines);
        const minY = Math.floor(b[0]);
        const maxY = Math.ceil(b[3]);

        Track.drawPolygon(this.track.debugCanvasContext, points, null, '#f00');

        for (let y = minY; y < maxY; y++) {
            const meetPoint = this.getLinesMeetY(y, lines);

            for (let i = 1; i < meetPoint.length; i += 2) {
                const maxX = Math.ceil(meetPoint[i]);
                for (let x = Math.floor(meetPoint[i - 1]); x < maxX; x++) {
                    if (this.track.collisions[y][x]) return true;
                }
            }
        }
        return false;
    }

    private hasPolyPolyCollision(lines1: Line[], lines2: Line[]): boolean {
        const b1 = this.getLinesBounds(lines1);
        const b2 = this.getLinesBounds(lines2);
        return this.hasRectangleCollision(b1, b2);
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
        let line = TrackGenerator.pointToGate(pos, angle, this.track.width * this.track.height);
        // let minPoint = pos;
        let minDistance = +this.settings.maxGateHalfSize;
        let collision;

        const gates = this.track.gates.concat(this.boundsLines());

        for (let i = gates.length - 1; i > 1; i--) {
            for (let j of [0, 1] as (0 | 1)[]) {
                collision = this.lineIntersectionPoint(
                    [line[0], line[1]],
                    [gates[i][j], gates[i - 1][j]],
                );
                if (collision !== null) {
                    const distance = TrackGenerator.lineLength([collision, pos]);
                    if (distance < 0 || distance < minDistance) {
                        // minPoint = collision;
                        minDistance = distance;
                    }
                }
            }
        }

        return minDistance;
    }

    private predictDirections(startPos: Point, targetPos: Point, currentAngle: number): Point[] {

        const targetAngle = TrackGenerator.lineAngle([startPos, targetPos]);

        const angles: number[] = [
            TrackGenerator.normalizeAngle(currentAngle)
        ];

        for (let i = +this.settings.curveComputeCount - 1; i > 0; i--) {
            const o = (i * this.degreesToRadians(+this.settings.maxCurve)) / +this.settings.curveComputeCount;
            angles.push(
                TrackGenerator.normalizeAngle(currentAngle + o)
            );
            angles.push(
                TrackGenerator.normalizeAngle(currentAngle - o)
            );
        }

        angles.sort((a, b) => {
            return Math.abs(TrackGenerator.normalizeAngle(targetAngle - b)) - Math.abs(TrackGenerator.normalizeAngle(targetAngle - a));
        });

        const vectors: Point[] = [];

        for (const angle of angles) {
            vectors.push(
                TrackGenerator.angleToVectorMultiplied(angle, +this.settings.gateDistance)
            );
        }

        return vectors;
    }

    private randomShuffle(a: Point[]): Point[] {
        return a.sort(() => 0.5 - this.random());;
    }

    private pointAngleMatches(point1: Point, angle1: number, point2: Point, angle2: number): boolean {
        const d = TrackGenerator.lineLengthUnnormed([point1, point2]);
        if (d > +this.settings.distanceMatch) return false;
        const k = Math.abs(TrackGenerator.normalizeAngle(angle1 - angle2));
        if (k > +this.settings.angleMatch) return false;
        return true;
    }

    private posAngleToGrid(pos: Point, angle: number): [number, number, number] {
        return [
            Math.floor(pos[1] * +this.settings.yComputeFactor),
            Math.floor(pos[0] * +this.settings.xComputeFactor),
            Math.floor(TrackGenerator.normalizeAngle10(angle) * +this.settings.angleComputeFactor)
        ];
    }

    private isValidGridPos(gridPos: [number, number, number], gridSize: [number, number, number]): boolean {
        return gridPos[0] >= 0 && gridPos[0] < gridSize[0] &&
            gridPos[1] >= 0 && gridPos[1] < gridSize[1] &&
            gridPos[2] >= 0 && gridPos[2] < gridSize[2];
    }

    findTrackDFS(iterationCount = 0, trys = 0): [Line[], boolean, number] {
        this.settings.validate();

        const gates: [Line, Line[], number][] = [];

        const endPos = this.gateCenterPos(this.endGate);
        const endAngle = TrackGenerator.gateAngle(this.endGate);

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

        gates.push([this.startGate, [], 0]);

        while (true) {
            let current = gates.pop();
            if (current === undefined) {
                if (trys >= +this.settings.maxTrys - 1) return [[], false, iterationCount];
                this.settings.angleComputeFactor += 1;
                return this.findTrackDFS(iterationCount, trys + 1);
            };
            const currentGate = current[0];
            const traversedGates = current[1];
            let prevCollisions = current[2];

            const currentPos = this.gateCenterPos(currentGate);
            const currentAngle = TrackGenerator.gateAngle(currentGate);

            const currentGridPos = this.posAngleToGrid(currentPos, currentAngle);
            visited[currentGridPos[0]][currentGridPos[1]][currentGridPos[2]] = true;

            Track.drawPoint(this.track.debugCanvasContext, currentPos, '#fff');

            const foundEnd = this.pointAngleMatches(currentPos, currentAngle, endPos, endAngle);
            const segementCount = traversedGates.length;
            const finishedTrack = foundEnd && segementCount >= +this.settings.minSegments;
            if (finishedTrack ||
                segementCount >= +this.settings.maxSegments) {

                if (finishedTrack) {
                    traversedGates.push(this.endGate);
                }

                console.log(segementCount + ' segments');
                console.log(prevCollisions + ' collisions');
                return [traversedGates, foundEnd, iterationCount];
            }

            let diretions = this.predictDirections(currentPos, endPos, currentAngle);
            switch (this.mode) {
                case 'longest':
                    diretions = diretions.reverse();
                    break;
                case 'random':
                    diretions = this.randomShuffle(diretions);
                    break;
            }

            for (let d of diretions) {
                const newPos: Point = [Math.floor(currentPos[0] + d[0]), Math.floor(currentPos[1] + d[1])];

                const newAngle = TrackGenerator.vectorAngle(d);

                let size = Math.min(+this.settings.maxGateHalfSize, this.calcMaxGateHalfSize(newPos, newAngle));
                if (size > +this.settings.minGateHalfSize) size = +this.settings.minGateHalfSize + (this.random() * (size - +this.settings.minGateHalfSize));
                size = Math.max(+this.settings.minGateHalfSize, size);

                const newGate = TrackGenerator.pointToGate(newPos, newAngle, size);

                const newGridPos = this.posAngleToGrid(newPos, newAngle);

                if (this.isValidGridPos(newGridPos, gridSize) &&
                    !visited[newGridPos[0]][newGridPos[1]][newGridPos[2]] &&
                    !this.lineOutBounds(newGate)) {
                    if (this.gateHasCollision(currentGate, newGate, traversedGates)) prevCollisions += 1;
                    if (prevCollisions <= +this.settings.maxCollisions) gates.push([newGate, traversedGates.concat([currentGate]), prevCollisions]);
                }
            }

            iterationCount++;
            if (iterationCount > +this.settings.maxIterations) return [[], false, iterationCount];
        }
    }

    private findTrackDFSWorker(background = true): Observable<[Line[], boolean, number]> {
        if (background && typeof Worker !== 'undefined') {
            // Create a new Worker
            const worker = new Worker(new URL('./track-generator.worker', import.meta.url));
            const workerSubscription = fromEvent(worker, 'message').pipe(
                take(1),
                map((event: any) => {
                    console.log(event.data);
                    return event.data;
                }),
            );
            worker.postMessage({ type: 'start', trackGenerator: this.serialize() });
            return workerSubscription;
        } else {
            // Web Workers are not supported in this environment.
            // You should add a fallback so that your program still executes correctly.
            return of(this.findTrackDFS());
        }
    }

    generate(background = true): Observable<[number, number]> {
        const startTime = new Date().getTime();

        return this.findTrackDFSWorker(background).pipe(
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
                }

                return [generationTime, solution[2]];
            })
        );
    }
}
