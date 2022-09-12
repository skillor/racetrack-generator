import { parse } from './prefab-parser.js';
import { PrefabObject } from './prefab-object';
import { StaticObject, StaticObjectType } from './static-object';
import { Track } from '../track-generator/track';
import { PrefabVisitor } from './prefab-content-visitor';
import { JsonContentVisitor } from './json-content-visitor';
import * as THREE from 'three';
import Delaunator from 'delaunator';
import { DecalRoad } from './decal-road';
import { GameplayMission } from './gameplay-mission';


export interface Level {
    objects: PrefabObject[],
    minPos: number[],
    maxPos: number[],
    size: number[],
}

export const PRESETS = [
    'westcoast_track_parkinglot.prefab',
    'westcoast_parking_garage.prefab',
];


export class Prefab {
    content: string = '';
    parsed: any;
    keeps: PrefabObject[] = [];
    levels: {[key: string]:Level} = {};
    mission?: GameplayMission;
    static MIN_EPS = 0.001;

    constructor() {
    }

    private static persistentIdChars = '0123456789abcdef';
    private static persistentIdDashs = [8, 12, 16, 20];

    private static newLevel(): Level {
        return {
            objects: [],
            minPos: [Infinity, Infinity, Infinity],
            maxPos: [-Infinity, -Infinity, -Infinity],
            size: [0, 0, 0],
        };
    }

    static createPersitentId(): string {
        let r = '';
        for (let i = 0; i < 32; i++) {
            if (this.persistentIdDashs.includes(i)) r += '-';
            r += this.persistentIdChars[Math.floor(Math.random() * this.persistentIdChars.length)];
        }
        return r;
    }

    static createByContent(content: string): Prefab {
        const p = new Prefab();
        p.content = content;
        p.parse();
        return p;
    }

    static createByTracks(
        tracks: {[levelKey: string]:Track},
        trackScale: number,
        staticObjectType: StaticObjectType,
        prefab: Prefab | null = null,
        repeatObject: boolean = false,
        scaleObject: number[] = [1, 1, 1],
        levelName: string = 'unknown_level',
        trackName: string = 'unknown_track',
    ): Prefab {
        const p = new Prefab();

        if (prefab !== null) {
            p.keeps = prefab.keeps;
        }

        for (let levelKey of Object.keys(tracks)) {
            const track = tracks[levelKey];

            let mesh: THREE.Mesh | null = null;

            if (prefab !== null) {

                const referencePoints = [];

                for (let o of prefab.levels[levelKey].objects) {
                    if (o.type == 'TSStatic' && !o.isSpecial()) referencePoints.push(o.pos!);
                }

                const geom = new THREE.BufferGeometry();
                geom.setFromPoints(referencePoints.map((v) => new THREE.Vector3(v[0], v[1], v[2])));

                const indexDelaunay = Delaunator.from(
                    referencePoints
                );

                const meshIndex = []; // delaunay index => three.js index
                for (let i = 0; i < indexDelaunay.triangles.length; i++){
                    meshIndex.push(indexDelaunay.triangles[i]);
                }

                geom.setIndex(meshIndex); // add three.js index to the existing geometry
                geom.computeVertexNormals();
                mesh = new THREE.Mesh(
                    geom, // re-use the existing geometry
                );

                mesh.geometry.computeBoundingBox();
            }

            if (!(levelKey in p.levels)) p.levels[levelKey] = Prefab.newLevel();

            const drivePath = track.getDrivePath();
            if (drivePath.length > 0) {
                for (let i = 0; i < drivePath.length; i++) {
                    const pos = PrefabObject.pointFromLevelToPrefab([drivePath[i][0], drivePath[i][1]], trackScale, prefab?.levels[levelKey]);
                    drivePath[i] = [pos[0], pos[1], drivePath[i][2] / trackScale];
                }

                const decalRoad = DecalRoad.createByDrivePath(
                    drivePath,
                    mesh,
                );

                p.levels[levelKey].objects.push(decalRoad);

                p.mission = new GameplayMission(
                    levelName,
                    trackName,
                    decalRoad.nodes,
                );
            }

            const barriers = track.getBarrierLines();
            for (let side of ['left', 'right'] as ('left' | 'right')[]) {
                for (let barrier of barriers[side]) {
                    const objs = StaticObject.createByLineAndType(
                        [
                            PrefabObject.pointFromLevelToPrefab(barrier[0], trackScale, prefab?.levels[levelKey]),
                            PrefabObject.pointFromLevelToPrefab(barrier[1], trackScale, prefab?.levels[levelKey]),
                        ],
                        staticObjectType,
                        mesh,
                        side,
                        repeatObject,
                        scaleObject,
                    );

                    for (let obj of objs) {
                        p.levels[levelKey].objects.push(
                            obj
                        );
                    }
                }
            }
        }

        p.stringify();

        return p;
    }


    private static createObject(obj: any): PrefabObject {
        if (obj.type == 'TSStatic') {
            return StaticObject.createByObject(obj);
        }
        return PrefabObject.createByObject(obj);
    }

    getSortedBounds(levelKey: string): PrefabObject[] {
        return this.levels[levelKey].objects.filter((o) => o.isBounds()).sort((a, b) => a.getBoundsNumber() - b.getBoundsNumber());
    }

    stringify() {
        const v = new PrefabVisitor();
        v.visit(this);
        this.content = v.get();
    }

    toJson(parentName: string): string {
        const v = new JsonContentVisitor(parentName);
        v.visit(this);
        return v.get();
    }

    translate(translate: number[]) {
        for (let level of Object.values(this.levels)) {
            for (let obj of level.objects) {
                for (let i = 0; i < translate.length; i++) {
                    obj.pos![i] += translate[i];
                }
            }
        }
    }

    private parse() {
        try {
            this.keeps = [];
            this.levels = {};
            this.parsed = parse(this.content);
            for (let expr of this.parsed) {
                if (expr.type == 'assign' && expr.assign.name == '$ThisPrefab') {
                    for (let expr2 of expr.assign.value.content) {
                        if (expr2.type == 'value') {
                            const o = Prefab.createObject(expr2.value);
                            if (o.isKeep()) {
                                this.keeps.push(o);
                            } else {
                                if (!(o.levelKey in this.levels)) {
                                    this.levels[o.levelKey] = Prefab.newLevel();
                                }
                                this.levels[o.levelKey].objects.push(o);
                            }
                        }
                    }
                }
            }

            for (const level of Object.values(this.levels)) {
                for (let obj of level.objects) {
                    for (let i = 0; i < obj.pos!.length; i++) {
                        level.minPos[i] = Math.min(obj.pos![i], level.minPos[i]);
                        level.maxPos[i] = Math.max(obj.pos![i], level.maxPos[i]);
                    }
                }

                for (let i = 0; i < level.minPos.length; i++) {
                    level.size[i] = level.maxPos[i] - level.minPos[i];
                }
            }

        } catch (err) {
            console.log(err);
        }
    }
}
