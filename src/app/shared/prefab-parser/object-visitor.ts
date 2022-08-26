import { PrefabObject } from "./prefab-object";
import { StaticObject } from "./static-object";

export interface Visitor {
    visitPrefabObject(o: PrefabObject): unknown;

    visitStaticObject(o: StaticObject): unknown;
}
