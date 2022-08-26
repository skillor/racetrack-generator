import { Visitor } from "./object-visitor";
import * as THREE from "./three-math";

export class PrefabObject {
    type?: string;
    name?: string | null;
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

    setByObject(obj: any) {
        this.type = obj.type;
        this.name = obj.name;
        let pos;
        let rot;
        for (let expr of obj.content) {
            if (expr.type == 'assign') {
                if (expr.assign.name == 'position') {
                    pos = expr.assign.value;
                } else if (expr.assign.name == 'rotationMatrix') {
                    rot = expr.assign.value;
                }
            }
        }

        if (pos !== undefined) {
            this.pos = pos.split(' ').map((x: string) => +x);
        }
        if (rot !== undefined) {
            rot = rot.split(' ').map((x: string) => +x);
            this.rot = PrefabObject.rotationMatrixToEuler(rot);
        }
    }
}