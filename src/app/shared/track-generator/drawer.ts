import { Line } from "./line";
import { Math2D } from "./math2d";
import { Point } from "./point";

export class Drawer {
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

        let angle = -Math2D.gateAngle(gate);

        let start = Math2D.centerOfLine(gate);
        let v = Math2D.angleToVectorMultiplied(angle, size);
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
        v = Math2D.angleToVectorMultiplied(angle + 0.3, size * 0.8);
        context.lineTo(start[0] + v[0], start[1] + v[1]);

        context.moveTo(end[0], end[1]);

        v = Math2D.angleToVectorMultiplied(angle - 0.3, size * 0.8);
        context.lineTo(start[0] + v[0], start[1] + v[1]);

        context.closePath();

        context.stroke();
    }
}
