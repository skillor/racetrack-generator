import * as THREE from "./three-math";

export class PrefabObject {
    type: string;
    pos?: number[];
    rot?: number[];

    constructor(obj: any) {
        this.type = obj.type;
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
            const eu = new THREE.Euler();
            const m = new THREE.Matrix4();
            m.set(rot[0], rot[1], rot[2], 1, rot[3], rot[4], rot[5], 1, rot[6], rot[7], rot[8], 1, 0, 0, 0, 1);
            eu.setFromRotationMatrix(m);
            this.rot = eu.toArray().slice(0, 3);
        }
    }
}
