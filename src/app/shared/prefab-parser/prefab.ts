import { parse } from './parser.js';
import { PrefabObject } from './prefab-object';
import { StaticObject, StaticObjectType } from './static-object';
import { Track } from '../track-generator/track';
import { PrefabVisitor } from './prefab-content-visitor';
import { JsonContentVisitor } from './json-content-visitor';

export interface Level {
    objects: PrefabObject[],
    minPos: number[],
    maxPos: number[],
    size: number[],
}

export class Prefab {
    content: string = '';
    parsed: any;
    levels: {[key: string]:Level} = {};

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

    static createByTracks(tracks: {[levelKey: string]:Track}, trackScale: number, staticObjectType: StaticObjectType, prefab: Prefab | undefined = undefined): Prefab {
        const p = new Prefab();

        for (let levelKey of Object.keys(tracks)) {
            const track = tracks[levelKey];
            const referencePoints = [];
            const minPos = [0, 0];

            if (prefab !== undefined) {

                minPos[0] = prefab.levels[levelKey].minPos[0];
                minPos[1] = prefab.levels[levelKey].minPos[1];

                for (let o of prefab.levels[levelKey].objects) {
                    if (o.type == StaticObject.defaultType) referencePoints.push(o.pos!);
                }
            }

            for (let barrier of track.getBarrierLines()) {
                if (!(levelKey in p.levels)) p.levels[levelKey] = Prefab.newLevel();
                p.levels[levelKey].objects.push(
                    StaticObject.createByLineAndType(
                        [
                            [(barrier[0][0] / trackScale) + minPos[0], (barrier[0][1] / trackScale) + minPos[1]],
                            [(barrier[1][0] / trackScale) + minPos[0], (barrier[1][1] / trackScale) + minPos[1]],
                        ],
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

    private parse() {
        try {
            this.levels = {};
            this.parsed = parse(this.content);
            for (let expr of this.parsed) {
                if (expr.type == 'assign' && expr.assign.name == '$ThisPrefab') {
                    for (let expr2 of expr.assign.value.content) {
                        if (expr2.type == 'value') {
                            const o = Prefab.createObject(expr2.value);
                            if (!(o.levelKey in this.levels)) {
                                this.levels[o.levelKey] = Prefab.newLevel();
                            }
                            this.levels[o.levelKey].objects.push(o);
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
