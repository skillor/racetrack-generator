import { Line } from "../track-generator/line";
import { Point } from "../track-generator/point";
import { TrackGenerator } from "../track-generator/track-generator";
import { Visitor } from "./object-visitor";
import { Level } from "./prefab";
import { PrefabObject } from "./prefab-object";
import * as THREE from "./three-math";

export type StaticObjectType = {
    label: string,
    shapeName: string,
    angleOffset: number,
    size: number[],
    adjustSizeIndex: number[],
};

export class StaticObject extends PrefabObject {
    static defaultType = 'TSStatic';
    static defaultName = null;

    static shapeTypes: {[key:string]:StaticObjectType} = {
        '/levels/west_coast_usa/art/shapes/objects/constructionbarrier.dae': {
            label: 'constructionbarrier',
            shapeName: '/levels/west_coast_usa/art/shapes/objects/constructionbarrier.dae',
            angleOffset: Math.PI * 0.5,
            size: [0.55, 1.9, 0.9],
            adjustSizeIndex: [1],
        },
    };

    shapeName?: string;
    shapeType?: StaticObjectType;

    override accept(v: Visitor): unknown {
        return v.visitStaticObject(this);
    }

    static override createByObject(obj: any): StaticObject {
        const p = new StaticObject();
        p.setByObject(obj);
        return p;
    }

    override setByObject(obj: any): void {
        super.setByObject(obj);
        for (let expr of obj.content) {
            if (expr.type == 'assign') {
                if (expr.assign.name == 'shapeName') {
                    this.shapeName = expr.assign.value;
                    if (this.shapeName! in StaticObject.shapeTypes) this.shapeType = StaticObject.shapeTypes[this.shapeName!];
                    break;
                }
            }
        }
    }

    get2DBox(scale: number = 1, level: Level | undefined = undefined): Point[] {
        let min = [0, 0];
        if (level !== undefined) {
            min[0] = level.minPos[0];
            min[1] = level.minPos[1];
        }
        if (this.shapeType === undefined) return [];
        const center: Point = [this.pos![0], this.pos![1]];
        const size: Point = [this.shapeType.size[0] * this.scale[0] * 0.5, this.shapeType.size[1] * this.scale[1] * 0.5];
        const points = TrackGenerator.rotatedRect(center, size, -this.rot![2]);
        for (let i = 0; i < points.length; i++) {
            points[i] = PrefabObject.pointFromLevel(points[i], scale, level);
        }
        return points;
    }

    static createByLineAndType(line: Line, type: StaticObjectType, referencePoints: number[][]): StaticObject {
        const p = new StaticObject();
        const dist = TrackGenerator.lineLength(line);
        const center = TrackGenerator.centerOfLine(line);
        const angle = TrackGenerator.normalizeAngle(TrackGenerator.lineAngle(line));

        p.pos = [center[0], center[1], 0];

        const closest = referencePoints.sort((a, b) => {
            return TrackGenerator.lineLengthUnnormed([[a[0], a[1]], center]) < TrackGenerator.lineLengthUnnormed([[b[0], b[1]], center]) ? -1 : 1;
        });

        if (closest.length < 3) {
            p.pos[2] = closest[0][2];
        } else {

            let points = [closest[0], closest[1], closest[2]];

            let off = 3;
            while (true) {
                const startOff = off;
                if (points[0][0] == points[1][0] && points[0][0] == points[2][0] ||
                    points[0][1] == points[1][1] && points[0][1] == points[2][1]) {
                    points[2] = closest[off];
                    off++;
                }
                if (off > closest.length - 1) break;
                if (TrackGenerator.pointEquals(points[0], points[1]) || TrackGenerator.pointEquals(points[1], points[2])) {
                    points[1] = closest[off]
                    off++;
                }
                if (off > closest.length - 1) break;
                if (TrackGenerator.pointEquals(points[0], points[2])) {
                    points[2] = closest[off];
                    off++;
                }
                if (startOff == off) break;
                if (off > closest.length - 1) break;
            }

            points = points.map((v) => new THREE.Vector3(v[0], v[1], v[2]));
            const plane = new THREE.Plane();
            plane.setFromCoplanarPoints(points[0], points[1], points[2]);

            const ray = new THREE.Ray(new THREE.Vector3(p.pos[0], p.pos[1], 0), new THREE.Vector3(0, 0, 1));

            if (ray.intersectPlane(plane) === null) {
                console.log(ray);
                console.log(plane);
                console.log(points);
            }

            p.pos[2] = ray.intersectPlane(plane).z;
            if (p.pos[2] == 0) {
                console.log(ray);
                console.log(plane);
                console.log(points);
            }
        }

        p.rot = [0, 0, - angle - type.angleOffset];

        for (let i of type.adjustSizeIndex) {
            p.scale[i] = dist / type.size[i];
        }

        p.shapeType = type;
        p.shapeName = type.shapeName;

        p.type = this.defaultType;
        p.name = this.defaultName;

        return p;
    }
}
