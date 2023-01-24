import { finalize, fromEvent, map, Observable, of } from "rxjs";
import * as seedrandom from "seedrandom";
import { GeneratorMode } from "./generator-modes";
import { Line } from "./line";
import { Math2D } from "./math2d";
import { Point } from "./point";
import { Rect } from "./rectangle";
import { Settings } from "./settings";
import { Track } from "./track";

export class TrackGenerator {
    settings: Settings;
    progressEmitter?: (msg: any) => void;

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

    private lineOutBounds(line: Line): boolean {
        return this.pointOutBounds(line[0]) || this.pointOutBounds(line[1]);
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
                    if (Math2D.lineIntersectionPoint(
                        [connection[0], connection[1]], [currentGates[i][j], currentGates[i - 1][j]],
                    ) !== null) return true;
                }
            }
        }
        return false;
    }

    hasPolyPixelCollision(points: Point[]): boolean {
        const lines: Line[] = [];

        for (let i = 1; i < points.length; i++) {
            lines.push([points[i - 1], points[i]]);
        }
        lines.push([points[points.length - 1], points[0]]);

        const b = Math2D.getLinesBounds(lines);
        const minY = Math.floor(b[0]);
        const maxY = Math.ceil(b[3]);

        for (let y = minY; y < maxY; y++) {
            const meetPoint = Math2D.getLinesMeetY(y, lines);

            for (let i = 1; i < meetPoint.length; i += 2) {
                const maxX = Math.ceil(meetPoint[i]);
                for (let x = Math.floor(meetPoint[i - 1]); x < maxX; x++) {
                    if (this.pointOutBounds([x, y])) return true;
                    if (this.track.collisions[y][x]) return true;
                }
            }
        }
        return false;
    }

    getLinePixelCollisions(line: Line): Point[] {
        const center = Math2D.lineCenterPos(line);
        // TODO: 0.1
        const v = Math2D.angleToVectorMultiplied(Math2D.lineAngle(line), 1);
        let pos = center;
        const collisions: Point[] = [];
        for (let d of [-1, 1]) {
            while (true) {
                const fpos: Point = [Math.floor(pos[0]), Math.floor(pos[1])];
                if (this.pointOutBounds(fpos)) break;
                try {
                    if (this.track.collisions[fpos[1]][fpos[0]]) {
                        collisions.push(pos);
                        break;
                    }
                } catch {
                    collisions.push(pos);
                    break;
                }
                pos = [pos[0] + v[0] * d, pos[1] + v[1] * d];
            }
        }
        return collisions;
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
        let line = Math2D.pointToGate(pos, angle, this.track.width * this.track.height);
        let minDistance = +this.settings.maxGateHalfSize;
        let collision;

        const gates = this.track.gates.concat(this.boundsLines());

        const checkCollisions: Line[] = []
        for (let i = gates.length - 1; i > 1; i--) {
            for (let j of [0, 1] as (0 | 1)[]) {
                checkCollisions.push([gates[i][j], gates[i - 1][j]]);
            }
        }

        for (let c of checkCollisions) {
            collision = Math2D.lineIntersectionPoint(
                line,
                c,
            );
            if (collision !== null) {
                const distance = Math2D.lineLength([collision, pos]);
                if (distance < 0) return 0;
                if (distance < minDistance) {
                    minDistance = distance;
                }
            }
        }

        for (let c of this.getLinePixelCollisions(line)) {
            const distance = Math2D.lineLength([c, pos]);
                if (distance < 0) return 0;
                if (distance < minDistance) {
                    minDistance = distance;
                }
        }

        return minDistance;
    }

    private predictDirections(startPos: Point, targetPos: Point, currentAngle: number, currentSize: number): [Point, number, number][] {

        const targetAngle = Math2D.lineAngle([startPos, targetPos]);

        const angles: number[] = [
            Math2D.normalizeAngle(currentAngle)
        ];

        for (let i = +this.settings.curveComputeCount - 1; i > 0; i--) {
            const o = (i * Math2D.degreesToRadians(+this.settings.maxCurve)) / +this.settings.curveComputeCount;
            angles.push(
                Math2D.normalizeAngle(currentAngle + o)
            );
            angles.push(
                Math2D.normalizeAngle(currentAngle - o)
            );
        }

        angles.sort((a, b) => {
            return Math.abs(Math2D.normalizeAngle(targetAngle - b)) - Math.abs(Math2D.normalizeAngle(targetAngle - a));
        });

        const res: [Point, number, number][] = [];

        for (const newAngle of angles) {
            const d = Math2D.angleToVectorMultiplied(newAngle, +this.settings.gateDistance);

            const newPos: Point = [Math.floor(startPos[0] + d[0]), Math.floor(startPos[1] + d[1])];

            const maxSize = Math.min(+this.settings.maxGateHalfSize, this.calcMaxGateHalfSize(newPos, newAngle));
            if (maxSize < +this.settings.minGateHalfSize) continue;

            let size = currentSize + ((this.random() - 0.5) * 2 * +this.settings.maxGateHalfSizeChange);
            size = Math.min(maxSize, size);
            size = Math.max(+this.settings.minGateHalfSize, size);
            // if (Math.abs(size - currentSize) > +this.settings.maxGateHalfSizeChange + 0.1) continue;
            res.push([newPos, newAngle, size]);
        }

        return res;
    }

    private pointAngleMatches(point1: Point, angle1: number, point2: Point, angle2: number): boolean {
        const d = Math2D.lineLengthUnnormed([point1, point2]);
        if (d > +this.settings.distanceMatch) return false;
        const k = Math.abs(Math2D.normalizeAngle(angle1 - angle2));
        if (k > +this.settings.angleMatch) return false;
        return true;
    }

    private posAngleToGrid(pos: Point, angle: number): [number, number, number] {
        return [
            Math.floor(pos[1] * +this.settings.yComputeFactor),
            Math.floor(pos[0] * +this.settings.xComputeFactor),
            Math.floor(Math2D.normalizeAngle10(angle) * +this.settings.angleComputeFactor)
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

        const endPos = Math2D.lineCenterPos(this.endGate);
        const endAngle = Math2D.gateAngle(this.endGate);

        const gridSize = this.posAngleToGrid([this.track.width, this.track.height], Math.PI);

        console.log('grid size', gridSize);

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
            }
            const currentGate = current[0];
            const traversedGates = current[1];
            let prevCollisions = current[2];

            const currentPos = Math2D.lineCenterPos(currentGate);
            const currentAngle = Math2D.gateAngle(currentGate);
            const currentSize = Math2D.lineLength(currentGate) / 2;

            const currentGridPos = this.posAngleToGrid(currentPos, currentAngle);
            visited[currentGridPos[0]][currentGridPos[1]][currentGridPos[2]] = true;

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

            if (this.progressEmitter) this.progressEmitter([traversedGates, foundEnd, iterationCount]);

            let newGates = this.predictDirections(currentPos, endPos, currentAngle, currentSize);
            switch (this.mode) {
                case 'longest':
                    newGates.reverse();
                    break;
                case 'random':
                    newGates.sort(() => 0.5 - this.random());
                    break;
                case 'maxwidth':
                    newGates.sort((a, b) => a[2] - b[2]);
                    break;
            }

            for (let g of newGates) {
                const newPos = g[0];
                const newAngle = g[1];
                const size = g[2];

                const newGate = Math2D.pointToGate(newPos, newAngle, size);

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
                map((event: any) => {
                    return event.data;
                }),
                finalize(() => worker.postMessage({type: 'stop'})),
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
        const initialGates = [...this.track.gates];
        return this.findTrackDFSWorker(background).pipe(
            map((solution) => {
                const generationTime = new Date().getTime() - startTime;

                if (solution[0].length == 0) {
                    console.log('path was not found!');
                    return [generationTime, solution[2]];
                }

                const gates = solution[0];
                if (solution[1]) console.log('path is finished');

                this.track.gates = [...initialGates, ...gates];

                return [generationTime, solution[2]];
            })
        );
    }
}
