import { parse } from './parser.js';
import { PrefabObject } from './prefab-object';
import { StaticObject, StaticObjectType } from './static-object';
import { Track } from '../track-generator/track';
import { Line } from '../track-generator/line';
import { ContentVisitor } from './object-content-visitor';

export class Prefab {
    content: string = '';
    parsed: any;
    objects: PrefabObject[] = [];
    minPos: number[] = [Infinity, Infinity, Infinity];
    maxPos: number[] = [-Infinity, -Infinity, -Infinity];
    size: number[] = [0, 0, 0];

    constructor() {

    }

    static createByContent(content: string): Prefab {
        const p = new Prefab();
        p.content = content;
        p.parse();
        return p;
    }

    static createByTrack(track: Track, trackScale: number, staticObjectType: StaticObjectType, prefab: Prefab | undefined = undefined): Prefab {
        const referencePoints = [];
        const minPos = [0, 0];

        if (prefab !== undefined) {

            minPos[0] = prefab.minPos[0];
            minPos[1] = prefab.minPos[1];

            for (let o of prefab.objects) {
                if (o.type == StaticObject.defaultType) referencePoints.push(o.pos!);
            }
        }

        const p = new Prefab();
        for (let i = track.gates.length - 1; i > 1; i--) {
            for (let j of [0, 1] as (0 | 1)[]) {
                const line: Line = [
                    [(track.gates[i][j][0] / trackScale) + minPos[0], (track.gates[i][j][1] / trackScale) + minPos[1]],
                    [(track.gates[i - 1][j][0] / trackScale) + minPos[0], (track.gates[i - 1][j][1] / trackScale) + minPos[1]],
                ];
                p.objects.push(
                    StaticObject.createByLineAndType(
                        line,
                        staticObjectType,
                        referencePoints,
                        )
                );
            }
        }

        p.stringify();

        return p;
    }

    private static createObject(obj: any): PrefabObject {
        if (obj.type === StaticObject.defaultType) {
            return StaticObject.createByObject(obj);
        }
        return PrefabObject.createByObject(obj);
    }

    private stringify() {
        const v = new ContentVisitor();
        v.visit(this);
        this.content = v.get();
    }

    private parse() {
        try {
            this.parsed = parse(this.content);
            for (let expr of this.parsed) {
                if (expr.type == 'assign' && expr.assign.name == '$ThisPrefab') {
                    for (let expr2 of expr.assign.value.content) {
                        if (expr2.type == 'value') {
                            this.objects.push(Prefab.createObject(expr2.value));
                        }
                    }
                }
            }

            for (let obj of this.objects) {
                if (obj.pos !== undefined) {
                    for (let i = 0; i < obj.pos.length; i++) {
                        this.minPos[i] = Math.min(obj.pos[i], this.minPos[i]);
                        this.maxPos[i] = Math.max(obj.pos[i], this.maxPos[i]);
                    }
                }
            }

            for (let i = 0; i < this.minPos.length; i++) {
                this.size[i] = this.maxPos[i] - this.minPos[i];
            }

            console.log(this.minPos);
            console.log(this.maxPos);
            console.log(this.size);

            console.log(this.objects);
        } catch (err) {
            console.log(err);
        }
    }
}
