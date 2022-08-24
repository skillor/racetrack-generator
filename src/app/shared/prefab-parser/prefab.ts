import { parse } from './parser.js';
import { PrefabObject } from './object';
import { StaticObject } from './static-object';

export class Prefab {
    content: string;
    parsed: any;
    objects: PrefabObject[] = [];
    minPos: number[] = [Infinity, Infinity, Infinity];
    maxPos: number[] = [-Infinity, -Infinity, -Infinity];
    size: number[] = [0, 0, 0];

    constructor(content: string) {
        this.content = content;
        this.parse();
    }

    private static createObject(obj: any): PrefabObject {
        if (obj.type === 'TSStatic') {
            return new StaticObject(obj);
        }
        return new PrefabObject(obj);
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
