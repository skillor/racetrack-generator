import { PrefabObject } from "./object";

export class StaticObject extends PrefabObject {

    shapeName?: string;

    constructor(obj: any) {
        super(obj);

        for (let expr of obj.content) {
            if (expr.type == 'assign') {
                if (expr.assign.name == 'shapeName') {
                    this.shapeName = expr.assign.value;
                }
            }
        }
    }
}
