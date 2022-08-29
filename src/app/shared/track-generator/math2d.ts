import { Line } from "./line";
import { Point } from "./point";
import { Rect } from "./rectangle";

export class Math2D {
    static TWO_PI = Math.PI * 2;

    static colorMatch(color1: Uint8ClampedArray, color2: Uint8ClampedArray, diff = 0): boolean {
        return Math.abs(color1[0] - color2[0]) + Math.abs(color1[1] - color2[1]) + Math.abs(color1[2] - color2[2]) < diff;
    }

    static pointEquals(point1: Point, point2: Point): boolean {
        return point1[0] == point2[0] && point1[1] == point2[1];
    }

    static lineEqualsStrict(line1: Line, line2: Line): boolean {
        return this.pointEquals([line1[0][0], line1[0][1]], [line2[0][0], line2[0][1]]) && this.pointEquals([line1[1][0], line1[1][1]], [line2[1][0], line2[1][1]]);
    }

    static lineCenterPos(gate: Line): Point {
        return [
            gate[0][0] + (gate[1][0] - gate[0][0]) * 0.5,
            gate[0][1] + (gate[1][1] - gate[0][1]) * 0.5,
        ];
    }

    static degreesToRadians(degrees: number): number {
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

    static pointTravel(point: Point, angle: number, distance: number, round: boolean = false): Point {
        const p: Point = [point[0] + Math.cos(angle) * distance, point[1] + Math.sin(angle) * distance];
        if (round) {
            p[0] = Math.round(p[0]);
            p[1] = Math.round(p[1]);
        }
        return p;
    }

    static centerOfLine(line: Line): Point {
        return [(line[0][0] + line[1][0]) * 0.5, (line[0][1] + line[1][1]) * 0.5];
    }

    static lineIntersectionPoint(line1: Line, line2: Line): Point | null {
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

    static getLineBounds(l: Line): Rect {
        return [
            Math.min(l[0][1], l[1][1]),
            Math.min(l[0][0], l[1][0]),
            Math.max(l[0][0], l[1][0]),
            Math.max(l[0][1], l[1][1]),
        ];

    }

    static getLinesBounds(lines: Line[]): Rect {
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

    static hasRectangleCollision(rect1: Rect, rect2: Rect): boolean {
        return rect1[1] < rect2[2] &&
            rect1[2] > rect2[1] &&
            rect1[0] < rect2[3] &&
            rect1[3] > rect2[0];
    }

    static lineIsValidY(y: number, line: Line): boolean {
        if (y >= line[0][1] && y < line[1][1]) return true;
        if (y >= line[1][1] && y < line[0][1]) return true;
        return false;
    }

    static lineGetM(line: Line): number {
        return (line[1][1] - line[0][1]) / (line[1][0] - line[0][0]);
    }

    static lineGetX(y: number, line: Line): number {
        return 1 / this.lineGetM(line) * (y - line[0][1]) + line[0][0];
    }

    static getLinesMeetY(y: number, lines: Line[]): number[] {
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

    static findDuplicates<T>(lines: T[], comp: (a:T, b:T) => boolean): number[][] {
        const sortedArr = [...lines].sort((a, b) => comp(a, b) ? 0 : 1);
        const results: number[][] = [];
        let cr: number[] = [];
        for (let i = 0; i < sortedArr.length - 1; i++) {
            cr.push(i)
            if (!comp(sortedArr[i + 1], sortedArr[i])) {
                results.push(cr);
                cr = [];
            }
        }
        return results;
    }

    static findDuplicatesByIndex(index: number, duplicates: number[][]): number[] {
        for (let d of duplicates) {
            if (d.includes(index)) return d;
        }
        return [index];
    }

    static medianOfPoints(points: Point[], indezes: number[]): Point {
        let x = 0;
        let y = 0;
        for (let i of indezes) {
            x += points[i][0];
            y += points[i][1];
        }
        const n = indezes.length;
        return [x / n, y / n];
    }
}
