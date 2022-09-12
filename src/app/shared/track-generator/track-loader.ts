import { Math2D } from "./math2d";
import { Track } from "./track";
import * as ImageTracer from './imagetracer';
import { Line } from "./line";

export class TrackLoader {
    static fromImage(canvas: HTMLCanvasElement, ltres: number): Track {
        const width = canvas.width;
        const height = canvas.height;

        const match = new Uint8ClampedArray([255, 255, 0]);

        const ctx = canvas.getContext('2d')!;

        const sampleSize = 1;

        const canvas2 = document.createElement('canvas');
        canvas2.width = Math.ceil(width / sampleSize);
        canvas2.height = Math.ceil(height / sampleSize);
        const ctx2 = canvas2.getContext('2d')!;
        ctx2.fillStyle = '#fff';

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (Math2D.colorMatch(ctx.getImageData(x, y, 1, 1).data, match, 10)) ctx2.fillRect(Math.floor(x / sampleSize), Math.floor(y / sampleSize), 1, 1);
            }
        }

        const options = { qtres:0.01, ltres: ltres, pal: [{r:0,g:0,b:0,a:255}, {r:255,g:255,b:255,a:255}], pathomit: 0 };

        const groups: Line[][] = [];
        const trace = ImageTracer.imagedataToTracedata(ctx2.getImageData(0, 0, width, height), options);
        console.log(trace);
        for (let i = 0; i < trace.palette.length; i++) {
            if (trace.palette[i].r != 0) {
                for (let o of trace.layers[i]) {
                    const lines: Line[] = [];
                    for (let seg of o.segments) {
                        if (seg.type == 'L') {
                            lines.push([[seg.x1 * sampleSize, seg.y1 * sampleSize], [seg.x2 * sampleSize, seg.y2 * sampleSize]]);
                        }
                    }
                    groups.push(lines);
                }
            }
        }

        const track = new Track(width, height, [], [], []);
        track.barrierLines = { left: groups.filter((_, i) => i % 2 == 0).flat(), right: groups.filter((_, i) => i % 2 == 1).flat() };

        return track;
    }
}
