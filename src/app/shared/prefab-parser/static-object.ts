import { Line } from "../track-generator/line";
import { TrackGenerator } from "../track-generator/track-generator";
import { Visitor } from "./object-visitor";
import { PrefabObject } from "./prefab-object";

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

    static types: StaticObjectType[] = [
        {
            label: 'constructionbarrier',
            shapeName: '/levels/west_coast_usa/art/shapes/objects/constructionbarrier.dae',
            angleOffset: Math.PI * 0.5,
            size: [0.3, 1.668, 1.1],
            adjustSizeIndex: [1],
        }
    ];

    shapeName?: string;

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
                }
            }
        }
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

        if (closest.length == 1) {
            p.pos[2] = closest[0][2];
        } else if (closest.length > 1) {
            const a = closest[0];
            const b = closest[1];
            const d = TrackGenerator.lineLengthUnnormed([[a[0], a[1]], center]) / TrackGenerator.lineLengthUnnormed([[a[0], a[1]], [b[0], b[1]]]);
            const f = 1 - d;
            p.pos[2] = a[2] * f + b[2] * d;
        }

        p.rot = [0, 0, angle + type.angleOffset];
        for (let i of type.adjustSizeIndex) {
            p.scale[i] = dist / type.size[i];
        }
        p.shapeName = type.shapeName;

        p.type = this.defaultType;
        p.name = this.defaultName;

        return p;
    }
}
