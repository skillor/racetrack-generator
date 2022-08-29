import { Point } from "./point";
import { Line } from "./line";
import { Track } from "./track";
import { Math2D } from "./math2d";

export class TrackLoader {
    private static samplePoint(p: Point, sampleSize: number): Point {
        return [Math.floor(p[0] / sampleSize), Math.floor(p[1] / sampleSize)];
    }

    private static sampleLine(line: Line, sampleSize: number): Line {
        return [this.samplePoint(line[0], sampleSize), this.samplePoint(line[1], sampleSize)];
    }

    static fromPixels(pixels: boolean[][], sampleSize: number): Track {
        const groups: Line[][] = [];

        for (let y = 0; y < pixels.length; y++) {
            for (let x = 0; x < pixels[y].length; x++) {

                if (pixels[y][x]) {
                    const points: Point[] = [];
                    const conns: number[] = [];

                    const s: [Point, number][] = [];

                    s.push([[x, y], -1]);

                    while (true) {
                        const t = s.pop();
                        if (t === undefined) break;
                        const v = t[0];
                        points.push(v);
                        conns.push(t[1]);
                        const n = points.length - 1;
                        pixels[v[1]][v[0]] = false;
                        for (let d of [
                            [1, 1],
                            [0, 1],
                            [1, 0],
                            [0, -1],
                            [-1, 0],
                            [-1, -1],
                        ]) {
                            const np: Point = [v[0] + d[0], v[1] + d[1]];
                            if (np[0] >= 0 && np[0] < pixels[y].length &&
                                np[1] >= 0 && np[1] < pixels.length &&
                                pixels[np[1]][np[0]]) {
                                s.push([np, n]);
                            }
                        }
                    }

                    const squashedPoints: Point[] = [];
                    for (let p of points) {
                        squashedPoints.push(this.samplePoint(p, sampleSize));
                    }

                    const duplicates = Math2D.findDuplicates(squashedPoints, Math2D.pointEquals);
                    const final: Line[] = [];
                    for (let d of duplicates) {
                        if (d.length > 1) {
                            let l = Math2D.bestLineThroughPoints(points, d);
                            final.push(l);
                        }

                    }
                    console.log(duplicates);
                    console.log(final);
                    groups.push(final);
                }
            }
        }

        const track = new Track(pixels[0].length, pixels.length, [], [], []);
        track.barrierLines = { left: groups.filter((_, i) => i % 2 == 0).flat(), right: groups.filter((_, i) => i % 2 == 1).flat() };

        // console.log(groups);
        return track;
    }
}
