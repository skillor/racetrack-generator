export class Settings {
    minSegments: number = 50;
    maxSegments: number = 100000;
    xComputeFactor: number = 0.5;
    yComputeFactor: number = 0.5;
    angleComputeFactor: number = 9;
    maxTrys: number = 20;
    maxCurve: number = 45;
    gateDistance: number = 10;
    curveComputeCount: number = 4;
    maxIterations: number = 1000000;
    minGateHalfSize: number = 5;
    maxGateHalfSize: number = 15;

    constructor(obj: any = {}) {
        for (const key of this.getPropertyNames()) {
            this.setProperty(key, obj[key]);
        }
    }

    getType(value: any): String {
        return typeof value;
    }

    setProperty(key: string, value: any): void {
        if (this.getType(this.getProperty(key)) === this.getType(value)) (<any>this)[key] = value;
    }

    getProperty(key: string): any {
        return (<any>this)[key];
    }

    getPropertyNames(): string[] {
        return Object.getOwnPropertyNames(this);
    }

    validate() {
        this.minSegments = Math.min(this.minSegments, this.maxSegments);
    }

    serialize(): string {
        return JSON.stringify(Object.assign({}, this));
    }

    static unserialize(json: string): Settings {
        return new Settings(JSON.parse(json));
    }
}