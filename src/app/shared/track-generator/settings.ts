export class Settings {
    minSegments: number = 5;
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
    maxCollisions: number = 0;
    distanceMatch: number = 19;
    angleMatch: number = 0.3;

    constructor(obj: any = {}) {
        for (const key of this.getPropertyNames()) {
            let v = obj[key];
            if (this.getType(this.getProperty(key)) === 'number') v = +v;
            this.setProperty(key, v);
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

    copy(): Settings {
        return Settings.unserialize(this.serialize());
    }

    serialize(): string {
        return JSON.stringify(Object.assign({}, this));
    }

    static unserialize(json: string): Settings {
        return new Settings(JSON.parse(json));
    }
}
