import { DecalRoad } from "./decal-road";
import { Visitor } from "./object-visitor";
import { Prefab } from "./prefab";
import { PrefabObject } from "./prefab-object";
import { StaticObject } from "./static-object";

export class JsonContentVisitor implements Visitor {
    private parentName: string;
    private indent = 0;
    indentSize = 2;
    private s = '';

    constructor(parentName: string) {
        this.parentName = parentName;
    }

    private writeIndent(): void {
        this.s += ' '.repeat(this.indent * this.indentSize);
    }

    private writeLine(s: string): void {
        this.writeIndent();
        this.s += s + '\n';
    }

    private write(s: string): void {
        this.s += s;
    }

    get(): string {
        return this.s;
    }

    visit(prefab: Prefab): any {
        for (let keep of prefab.keeps) {
            keep.accept(this);
        }
        for (let level of Object.values(prefab.levels)) {
            for (let o of level.objects) {
                o.accept(this);
            }
        }
    }

    visitPrefabObject(o: PrefabObject): void {
    }

    visitStaticObject(o: StaticObject): void {
        if (o.type === undefined) return;
        if (o.name === undefined) return;

        const json: any = {
            'class': o.type,
            'persistentId': Prefab.createPersitentId(),
            '__parent': this.parentName,
            'position': o.pos!,
            'rotationMatrix': PrefabObject.eulerToRotationMatrix(o.rot!),
            'scale': o.scale!,
            'shapeName': o.shapeName!,
            'isRenderEnabled': false,
            'useInstanceRenderData': true,
            'collisionType': 'Visible Mesh Final',
            'prebuildCollisionData': true,
        };

        if (o.name !== null) {
            json.name = o.name;
        }

        this.writeLine(JSON.stringify(json));
    }

    visitDecalRoad(o: DecalRoad): void {
        if (o.type === undefined) return;
        if (o.name === undefined) return;

        const json: any = {
            'class': o.type,
            'persistentId': Prefab.createPersitentId(),
            '__parent': this.parentName,
            'detail': 1,
            "improvedSpline": true,
            'drivability': 1,
            'gatedRoad': true,
            'lanesLeft': 1,
            'lanesRight': 0,
            'material': 'road_invisible',
            'position': [0,0,0],
            'nodes': o.nodes,
        };

        if (o.name !== null) {
            json.name = o.name;
        }

        this.writeLine(JSON.stringify(json));
    }
}
