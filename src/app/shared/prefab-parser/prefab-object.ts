import { Point } from "../track-generator/point";
import { Visitor } from "./object-visitor";
import { Prefab } from "./prefab";
import * as THREE from "./three-math";

export class PrefabObject {
    name?: string | null;
    type?: string;
    pos?: number[];
    rot?: number[];
    scale: number[] = [1, 1, 1];

    accept(v: Visitor): unknown {
        return v.visitPrefabObject(this);
    }

    static rotationMatrixToEuler(rot: number[]): number[] {
        const eu = new THREE.Euler();
        const m = new THREE.Matrix4();
        m.set(rot[0], rot[1], rot[2], 1, rot[3], rot[4], rot[5], 1, rot[6], rot[7], rot[8], 1, 0, 0, 0, 1);
        eu.setFromRotationMatrix(m);
        return eu.toArray().slice(0, 3);
    }

    static eulerToRotationMatrix(eu: number[]): number[] {
        const e = new THREE.Euler()
        e.fromArray(eu.slice(0, 3));
        const mx = new THREE.Matrix4();
        mx.makeRotationFromEuler(e);
        const m = mx.toArray();
        return [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
    }

    static createByObject(obj: any): PrefabObject {
        const p = new PrefabObject();
        p.setByObject(obj);
        return p;
    }

    static pointFromPrefab(p: Point, scale: number = 1, prefab: Prefab | undefined): Point {
        let min = [0, 0];
        if (prefab !== undefined) {
            min[0] = prefab.minPos[0];
            min[1] = prefab.minPos[1];
        }
        return [(p[0] - min[0]) * scale, (p[1] - min[1]) * scale];
    }

    isStartObject(): boolean {
        return !!this.name && (this.name.includes('start') || this.name.includes('start_end'));
    }

    isEndObject(): boolean {
        return !!this.name && (this.name.includes('end') || this.name.includes('start_end'));
    }

    isCollision(): boolean {
        return !!this.name && this.name.includes('collision');
    }

    isSpecial(): boolean {
        return this.isStartObject() || this.isEndObject() || this.isCollision();
    }

    setByObject(obj: any) {
        this.type = obj.type;
        this.name = obj.name;
        let pos;
        let scale;
        let rot;
        for (let expr of obj.content) {
            if (expr.type == 'assign') {
                if (expr.assign.name == 'position') {
                    pos = expr.assign.value;
                } else if (expr.assign.name == 'scale') {
                    scale = expr.assign.value;
                } else if (expr.assign.name == 'rotationMatrix') {
                    rot = expr.assign.value;
                }
            }
        }

        if (pos !== undefined) {
            this.pos = pos.split(' ').map((x: string) => +x);
        }
        if (scale !== undefined) {
            this.scale = scale.split(' ').map((x: string) => +x);
        }
        if (rot !== undefined) {
            rot = rot.split(' ').map((x: string) => +x);
            this.rot = PrefabObject.rotationMatrixToEuler(rot);
        }

    }
}
