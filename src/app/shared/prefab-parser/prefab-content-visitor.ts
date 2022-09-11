import { DecalRoad } from "./decal-road";
import { Visitor } from "./object-visitor";
import { Prefab } from "./prefab";
import { PrefabObject } from "./prefab-object";
import { StaticObject } from "./static-object";

export class PrefabVisitor implements Visitor {
    private s = '';
    private indent = 0;
    indentSize = 2;

    private writeLine(s: string): void {
        this.s += ' '.repeat(this.indent * this.indentSize) + s + '\n';
    }

    get(): string {
        return this.s;
    }

    visit(prefab: Prefab): void {
        this.writeLine('//--- OBJECT WRITE BEGIN ---');
        this.writeLine('$ThisPrefab = new SimGroup() {');
        this.indent++;
        this.writeLine('canSave = "1";');
        this.writeLine('canSaveDynamicFields = "1";');
        this.writeLine('groupPosition = "0 0 0";');

        for (let keep of prefab.keeps) {
            keep.accept(this);
        }

        for (let level of Object.values(prefab.levels)) {
            for (let o of level.objects) {
                o.accept(this);
            }
        }
        this.indent--;
        this.writeLine('};');
        this.writeLine('//--- OBJECT WRITE END ---');
    }

    private writePositionRotationScale(o: PrefabObject): void {
        this.writeLine('position = "' + o.pos!.join(' ') + '";');
        this.writeLine('scale = "' + o.scale!.join(' ') + '";');
        this.writeLine('rotationMatrix = "' + PrefabObject.eulerToRotationMatrix(o.rot!).join(' ') + '";');
    }

    visitPrefabObject(o: PrefabObject): void {
        if (o.type === undefined) return;
        if (o.name === undefined) return;

        let name = '';
        if (o.name !== null) name = o.name;
        this.writeLine('new ' + o.type + '(' + o.name + ') {');
        this.indent++;
        this.writeLine('drawDebug = "0";');
        this.writeLine('directionalWaypoint = "0";');
        this.writeLine('excludeFromMap = "0";');
        this.writePositionRotationScale(o);
        this.writeLine('canSave = "1";');
        this.writeLine('canSaveDynamicFields = "1";');
        this.indent--;
        this.writeLine('};');
    }

    visitStaticObject(o: StaticObject): void {
        if (o.type === undefined) return;
        if (o.name === undefined) return;

        let name = '';
        if (o.name !== null) name = o.name;
        this.writeLine('new ' + o.type + '(' + name + ') {');
        this.indent++;
        this.writeLine('shapeName = "' + o.shapeName + '";');
        this.writeLine('dynamic = "0";');
        this.writeLine('playAmbient = "1";');
        this.writeLine('meshCulling = "0";');
        this.writeLine('originSort = "0";');
        this.writeLine('useInstanceRenderData = "1";');
        this.writeLine('instanceColor = "white";');
        this.writeLine('instanceColor1 = "white";');
        this.writeLine('instanceColor2 = "white";');
        this.writeLine('collisionType = "Visible Mesh Final";');
        this.writeLine('decalType = "Collision Mesh";');
        this.writeLine('prebuildCollisionData = "0";');
        this.writeLine('renderNormals = "0";');
        this.writeLine('forceDetail = "-1";');
        this.writePositionRotationScale(o);
        this.writeLine('isRenderEnabled = "false";');
        this.writeLine('canSave = "1";');
        this.writeLine('canSaveDynamicFields = "1";');
        this.indent--;
        this.writeLine('};');
    }

    visitDecalRoad(o: DecalRoad): void {
        if (o.type === undefined) return;
        if (o.name === undefined) return;

        let name = '';
        if (o.name !== null) name = o.name;

        this.writeLine('new ' + o.type + '(' + name + ') {');
        this.indent++;
        this.writePositionRotationScale(o);
        this.writeLine('material = "road_invisible";');
        this.writeLine('drivability = "1";');
        this.writeLine('lanesLeft = "1";');
        this.writeLine('lanesRight = "0";');
        this.writeLine('oneWay = "1";');
        this.writeLine('flipDirection = "0";');
        this.writeLine('gatedRoad = "1";');
        this.writeLine('useSubdivisions = "0";');
        this.writeLine('ImprovedSpline = "1";');
        this.writeLine('startTangent = "0";');
        this.writeLine('endTangent = "0";');
        this.writeLine('looped = "0";');
        this.writeLine('smoothness = "0.5";');
        this.writeLine('detail = "1";');
        this.writeLine('overObjects = "0";');
        this.writeLine('textureLength = "5";');
        this.writeLine('breakAngle = "3";');
        this.writeLine('renderPriority = "10";');
        this.writeLine('zBias = "0";');
        this.writeLine('decalBias = "0.000500000024";');
        this.writeLine('distanceFade = "0 0";');
        this.writeLine('startEndFade = "0 0";');
        this.writeLine('hiddenInNavi = "0";');
        this.writeLine('canSave = "1";');
        this.writeLine('canSaveDynamicFields = "1";');
        this.writeLine('useTemplate = "true";');
        for (let i = 0; i < o.nodes.length; i++) {
            this.writeLine('Node = "' + o.nodes[i].join(' ') + '";');
        }
        this.indent--;
        this.writeLine('};')
    }
}
