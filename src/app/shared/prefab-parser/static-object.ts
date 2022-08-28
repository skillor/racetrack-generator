import { Line } from "../track-generator/line";
import { Point } from "../track-generator/point";
import { TrackGenerator } from "../track-generator/track-generator";
import { Visitor } from "./object-visitor";
import { Level, Prefab } from "./prefab";
import { PrefabObject } from "./prefab-object";
import * as THREE from 'three';

export type StaticObjectType = {
    label: string,
    shapeName: string,
    angleOffset: number,
    size: number[],
    adjustSize: number[],
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
            adjustSize: [0, 1, 0],
        },
        '/levels/west_coast_usa/art/shapes/buildings/buildingblock_concrete.dae': {
            label: 'buildingblock_concrete',
            shapeName: '/levels/west_coast_usa/art/shapes/buildings/buildingblock_concrete.dae',
            angleOffset: 0,
            size: [4, 1, 2],
            adjustSize: [1, 0, 0],
        },
        '/levels/west_coast_usa/art/shapes/race/concrete_road_barrier_a.dae': {
            label: 'concrete_road_barrier_a',
            shapeName: '/levels/west_coast_usa/art/shapes/race/concrete_road_barrier_a.dae',
            angleOffset: 0,
            size: [3, 0.8, 1.1],
            adjustSize: [1, 0, 0],
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
            points[i] = PrefabObject.pointFromPrefabToLevel(points[i], scale, level);
        }
        return points;
    }

    static createByLineAndType(
        line: Line,
        type: StaticObjectType,
        mesh: THREE.Mesh | null = null,
        side: ('left' | 'right'),
        repeatObject: boolean = false,
        scaleObject: number[] = [1, 1, 1],
    ): StaticObject[] {
        const dist = TrackGenerator.lineLength(line);
        const center = TrackGenerator.centerOfLine(line);
        const angle = TrackGenerator.normalizeAngle(TrackGenerator.lineAngle(line));
        let quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -angle-type.angleOffset);

        const objs = [];

        const p = new StaticObject();

        p.rot = [0, 0, 0];
        p.pos = [center[0], center[1], 0];

        for (let i = 0; i < p.scale.length; i++) {
            p.scale[i] = scaleObject[i] + type.adjustSize[i] * ((dist / type.size[i]) - scaleObject[i]);
        }

        if (mesh) {
            const meshCenter = new THREE.Vector3();
            mesh.geometry.boundingBox!.getCenter(meshCenter);

            const targetAngle = TrackGenerator.lineAngle([
                center,
                [meshCenter.x, meshCenter.y],
            ])

            let off = 0;
            let collisionResults: THREE.Intersection[] = [];
            while (collisionResults.length == 0) {
                const offV = TrackGenerator.angleToVectorMultiplied(targetAngle, off);
                off += Prefab.MIN_EPS;
                const ray = new THREE.Raycaster(new THREE.Vector3(p.pos[0] + offV[0], p.pos[1] + offV[1], 0), new THREE.Vector3(0, 0, 1));
                collisionResults = ray.intersectObject(mesh);
            }
            const collision = collisionResults[0];

            p.pos[2] = collision.point.z;

            const quat = new THREE.Quaternion();
            quat.setFromUnitVectors(collision.face!.normal, new THREE.Vector3(0, 0, -1));

            quaternion = quat.multiply(quaternion);
        }

        const euler = new THREE.Euler();
        euler.setFromQuaternion(quaternion);

        p.rot[0] = euler.x;
        p.rot[1] = euler.y;
        p.rot[2] = euler.z;

        let off: Point = [Prefab.MIN_EPS, Prefab.MIN_EPS];
        off = TrackGenerator.rotatePoint(off, angle);

        p.pos[0] += off[0];
        p.pos[1] += off[1];
        if (side == 'right') p.pos[2] += Prefab.MIN_EPS;

        p.shapeType = type;
        p.shapeName = type.shapeName;

        p.type = this.defaultType;
        p.name = this.defaultName;

        return [p];
    }
}
