import { Prefab } from "./prefab";
import { PrefabObject } from "./prefab-object";
import { StaticObject } from "./static-object";

export class JsonContentVisitor {
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

        let name = '';
        if (o.name !== null) name = o.name;

        this.writeLine(JSON.stringify({
            'class': o.type,
            'persistentId': Prefab.createPersitentId(),
            '__parent': this.parentName,
            "position": o.pos!,
            "rotationMatrix": PrefabObject.eulerToRotationMatrix(o.rot!),
            "scale": o.scale!,
            "shapeName": o.shapeName!,
            "isRenderEnabled":false,
            "useInstanceRenderData":true,
            "collisionType":"Visible Mesh Final",
            "prebuildCollisionData":true,
        }));
    }
}
