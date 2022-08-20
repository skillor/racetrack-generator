import { Point } from "./point";

export interface Line {
    [0]: Point, // left
    [1]: Point, // right
}
