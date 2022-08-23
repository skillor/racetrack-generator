export class Settings {
    xComputeFactor: number = 0.5;
    yComputeFactor: number = 0.5;
    angleComputeFactor: number = 9;
    maxTrys: number = 20;
    maxCurve: number = Math.PI / 4;
    gateDistance: number = 10;
    curveComputeCount: number = 4;
    maxSegments: number = 100000;
    maxIterations: number = 1000000;
    minGateHalfSize: number = 5;
    maxGateHalfSize: number = 15;
    gateHalfSizeRandomFactor: number = 3;

    constructor() {
    }

    serialize(): string {
        return JSON.stringify(Object.assign({}, this));
    }

    static unserialize(json: string): Settings {
        const obj = JSON.parse(json);
        const s = new Settings();
        for (const prop of Object.getOwnPropertyNames(s)) {
            (<any>s)[prop] = obj[prop];
        }
        return s;
    }
}
