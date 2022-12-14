import { Point } from "../track-generator/point";
import { Visitor } from "./object-visitor";
import { PrefabObject } from "./prefab-object";
import * as THREE from 'three';

export class DecalRoad extends PrefabObject {
    override type = 'DecalRoad';
    override name = null;
    nodes: [number, number, number, number][] = [];

    override accept(v: Visitor): unknown {
        return v.visitDecalRoad(this);
    }

    static createByDrivePath(
        drivePath: [number, number, number][],
        mesh: THREE.Mesh | null = null
    ): DecalRoad {
        const p = new DecalRoad();

        for (let i = 0; i < drivePath.length; i++) {
            const node: [number, number, number, number] = [drivePath[i][0], drivePath[i][1], 0, drivePath[i][2]];
            if (mesh) {
                const collision = PrefabObject.getMeshCollision(mesh, [drivePath[i][0], drivePath[i][1]]);
                node[2] = collision.point.z;
            }
            p.nodes.push(node);
        }

        p.rot = [0, 0, 0];
        p.pos = [p.nodes[0][0], p.nodes[0][1], p.nodes[0][2]];

        return p;
    }
}
