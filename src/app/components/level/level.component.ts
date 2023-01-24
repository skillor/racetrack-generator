import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Level, Prefab } from 'src/app/shared/beamng/prefab';
import { PrefabObject } from 'src/app/shared/beamng/prefab-object';
import { StaticObject } from 'src/app/shared/beamng/static-object';
import { StorageService } from 'src/app/shared/storage/storage.service';
import { Drawer } from 'src/app/shared/track-generator/drawer';
import { GeneratorMode } from 'src/app/shared/track-generator/generator-modes';
import { Math2D } from 'src/app/shared/track-generator/math2d';
import { Settings } from 'src/app/shared/track-generator/settings';
import { Track } from 'src/app/shared/track-generator/track';
import { TrackGenerator } from 'src/app/shared/track-generator/track-generator';
import { TrackLoader } from 'src/app/shared/track-generator/track-loader';


@Component({
    selector: 'app-level',
    templateUrl: './level.component.html',
    styleUrls: ['./level.component.scss']
})
export class LevelComponent implements AfterViewInit {

    @ViewChild('trackCanvas', { static: false })
    trackCanvasRef?: ElementRef<HTMLCanvasElement>;

    @ViewChild('collisionCanvas', { static: false })
    collisionCanvasRef?: ElementRef<HTMLCanvasElement>;

    trackCanvas?: HTMLCanvasElement;
    collisionCanvas?: HTMLCanvasElement;

    @Input()
    levelKey = '';

    @Input()
    levelValue!: Level;

    @Input()
    drawColor = '#fff';

    @Input()
    strokeSize = 1;

    @Input()
    defaultGeneratorMode: GeneratorMode = 'longest';

    @Input()
    inputSeed = '';

    @Input()
    prefab?: Prefab = undefined;

    @Input()
    prefabScale: number = 1;

    @Input()
    sampleSize: number = 1;

    startGate: string = '';
    endGate: string = '';

    trackWidth: string = '200';
    trackHeight: string = '200';

    settings: Settings = Settings.unserialize('{}');

    deleteBarriers: string = '';

    generationTime = 0;
    generationIterations = 0;

    private getStorageKey(key: string) {
        return 'level_' + this.levelKey + '_' + key;
    }

    constructor(
        private storageService: StorageService,
    ) { }

    loadConfig() {
        this.startGate = this.storageService.load(this.getStorageKey('track_start'), this.startGate);
        this.endGate = this.storageService.load(this.getStorageKey('track_end'), this.endGate);

        this.trackWidth = this.storageService.load(this.getStorageKey('track_width'), this.trackWidth);
        this.trackHeight = this.storageService.load(this.getStorageKey('track_height'), this.trackHeight);
        this.settings = Settings.unserialize(this.storageService.load(this.getStorageKey('track_settings'), this.settings.serialize()));
    }

    saveConfig() {
        this.storageService.save(this.getStorageKey('track_start'), this.startGate);
        this.storageService.save(this.getStorageKey('track_end'), this.endGate);

        this.storageService.save(this.getStorageKey('track_width'), this.trackWidth);
        this.storageService.save(this.getStorageKey('track_height'), this.trackHeight);
        this.storageService.save(this.getStorageKey('track_settings'), this.settings.serialize());
    }

    ngAfterViewInit(): void {
        this.loadConfig();

        this.trackCanvas = this.trackCanvasRef!.nativeElement;
        this.collisionCanvas = this.collisionCanvasRef!.nativeElement;

        if (this.prefab) {
            this.trackWidth = '' + Math.round(this.prefab.levels[this.levelKey].size[0] * +this.prefabScale);
            this.trackHeight = '' + Math.round(this.prefab.levels[this.levelKey].size[1] * +this.prefabScale);
        }

        this.setSize();

        this.initCollisionCanvas();
        this.clearCollisions('#fff');

        const points = this.prefab?.getSortedBounds(this.levelKey).map(
            (o) => PrefabObject.pointFromPrefabToLevel([o.pos![0], o.pos![1]], +this.prefabScale, this.prefab?.levels[this.levelKey])
        );
        if (points) Drawer.drawPolygon(this.collisionCanvas.getContext('2d'), points, '#000');

        this.autoCollision();
        this.autoStartEnd();

        this.saveConfig();
    }

    autoCollision() {
        if (this.prefab === undefined) return;
        for (let obj of this.prefab.levels[this.levelKey].objects) {
            if (obj.isCollision()) this.makeCollision(obj);
        }
    }

    autoStartEnd() {
        if (this.prefab === undefined) return;
        for (let obj of this.prefab.levels[this.levelKey].objects) {
            if (obj.isStartObject()) this.useAsStart(obj);
            if (obj.isEndObject()) this.useAsEnd(obj);
        }
    }

    makeCollision(obj: PrefabObject): void {
        const sobj = <StaticObject>obj;
        if (sobj.hasOwnProperty('shapeType') && sobj.shapeType === undefined) return;
        const box = sobj.get2DBox(+this.prefabScale, this.prefab?.levels[this.levelKey]);
        Drawer.drawPolygon(this.collisionCanvas!.getContext('2d'), box, '#fff');
    }

    useAsStart(obj: PrefabObject): void {
        const pos = PrefabObject.pointFromPrefabToLevel([obj.pos![0], obj.pos![1]], +this.prefabScale, this.prefab?.levels[this.levelKey]);
        const angle = -obj.rot![2];
        this.startGate = JSON.stringify(
            Math2D.pointToGate(<any>pos, angle, (+this.settings.minGateHalfSize + +this.settings.maxGateHalfSize) / 2, true)
        );
    }

    useAsEnd(obj: PrefabObject): void {
        const pos = PrefabObject.pointFromPrefabToLevel([obj.pos![0], obj.pos![1]], +this.prefabScale, this.prefab?.levels[this.levelKey]);
        const angle = -obj.rot![2];
        this.endGate = JSON.stringify(
            Math2D.pointToGate(<any>pos, angle, (+this.settings.minGateHalfSize + +this.settings.maxGateHalfSize) / 2, true)
        );
    }


    private initCollisionCanvas(): void {
        this.collisionCanvas!.addEventListener('mousemove', (e) => {
            this.canvasXY('move', e);
        }, false);
        this.collisionCanvas!.addEventListener('mousedown', (e) => {
            this.canvasXY('down', e);
        }, false);
        this.collisionCanvas!.addEventListener('mouseup', (e) => {
            this.canvasXY('up', e);
        }, false);
        this.collisionCanvas!.addEventListener('mouseout', (e) => {
            this.canvasXY('out', e);
        }, false);
    }

    private mouseDown = false;

    private canvasXY(res: string, e: MouseEvent): void {
        if (res == 'down') {
            this.mouseDown = true;
        } else if (res == 'up') {
            this.mouseDown = false;
        } else if (res == 'out') {
            this.mouseDown = false;
        } else if (res == 'move') {
            if (this.mouseDown) {
                const br = this.collisionCanvas!.getBoundingClientRect();
                this.drawCanvas(e.clientX - br.left, e.clientY - br.top);
            }
        }
    }

    private drawCanvas(x: number, y: number): void {
        const ctx = this.collisionCanvas!.getContext('2d')!;
        ctx.fillStyle = this.drawColor;
        ctx.fillRect(x - +this.strokeSize, y - +this.strokeSize, +this.strokeSize + 1, +this.strokeSize + 1);
    }

    clearCollisions(color: string = '#000'): void {
        this.collisionCanvas!.width = this.collisionCanvas!.width;
        const ctx = this.collisionCanvas!.getContext('2d')!;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, this.collisionCanvas!.width, this.collisionCanvas!.height);
    }

    setSize() {
        const width = +this.trackWidth;
        const height = +this.trackHeight;

        this.trackCanvas!.width = width;
        this.trackCanvas!.height = height;

        const context = this.collisionCanvas!.getContext('2d')!;

        const data = context.getImageData(0, 0, this.collisionCanvas!.width, this.collisionCanvas!.height);

        this.collisionCanvas!.width = width;
        this.collisionCanvas!.height = height;

        this.clearCollisions();

        context.putImageData(data, 0, 0);
    }

    track?: Track;
    setTrack(t: Track) {
        this.track = t;
    }

    getTrack(): Track {
        return this.track!;
    }

    generateTrack(): Observable<boolean> {
        this.saveConfig();

        this.setSize();

        const width = +this.trackWidth;
        const height = +this.trackHeight;

        const context = this.collisionCanvas!.getContext('2d')!;

        const startGate = JSON.parse(this.startGate);
        const endGate = JSON.parse(this.endGate);

        const match = new Uint8ClampedArray([255, 255, 255]);
        const collisions: boolean[][] = new Array<boolean[]>(height);
        for (let y = 0; y < height; y++) {
            collisions[y] = new Array<boolean>(width);
            for (let x = 0; x < width; x++) {
                collisions[y][x] = Math2D.colorMatch(context.getImageData(x, y, 1, 1).data, match);
            }
        }

        this.setTrack(new Track(
            width,
            height,
            collisions,
            [
                endGate,
                startGate,
            ],
        ));

        return this.addSegments();
    }

    addSegments(): Observable<boolean> {
        const tStartGate = JSON.parse(this.startGate);
        const tEndGate = JSON.parse(this.endGate);

        this.saveConfig();

        let startGate = this.getTrack().lastGate();
        if (startGate === undefined) startGate = tStartGate;

        const trackGenerator = new TrackGenerator(
            this.getTrack(),
            startGate,
            tEndGate,
            this.defaultGeneratorMode,
            this.inputSeed + this.levelKey,
            this.settings.copy(),
        );

        return trackGenerator.generate(true).pipe(
            map((gen) => {
                this.generationTime = gen[0];
                this.generationIterations = gen[1];
                this.getTrack().clone().drawTrack(this.trackCanvas?.getContext('2d'));
                this.track = this.getTrack().clone();
                return true;
            }),
        );
    }

    deleteSegments() {
        this.saveConfig();

        this.getTrack().deleteLastGates(+this.settings.maxSegments);

        this.getTrack().drawTrack(this.trackCanvas?.getContext('2d'));
    }

    drawTrack() {
        this.getTrack().drawTrack(this.trackCanvas?.getContext('2d'));
    }

    changeDeleteBarriers() {
        this.getTrack().deletedBarriers = this.deleteBarriers.split(',').map((v) => +v);
        this.drawTrack();
    }

    createTrackCanvas(): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = +this.trackWidth;
        canvas.height = +this.trackHeight;

        const ctx = canvas.getContext('2d');
        ctx!.putImageData(this.collisionCanvas!.getContext('2d')!.getImageData(0, 0, +this.trackWidth, +this.trackWidth), 0, 0);
        Drawer.drawGateArrow(ctx, JSON.parse(this.startGate), 3 * +this.prefabScale, '#0f0');
        Drawer.drawGateArrow(ctx, JSON.parse(this.endGate), -3 * +this.prefabScale, '#f00');
        this.getTrack()?.drawBarrierLines(ctx, '#ff0', '#ff0', 2, 2);
        return canvas;
    }

    importCollision(img: HTMLImageElement, xOffset: number) {
        this.collisionCanvas!.getContext('2d')?.drawImage(
            img, xOffset, 0,
            this.collisionCanvas!.width, this.collisionCanvas!.height,
            0, 0, this.collisionCanvas!.width, this.collisionCanvas!.height
        );
    }

    importTrack(img: HTMLImageElement, xOffset: number) {
        const width = +this.trackWidth;
        const height = +this.trackHeight;

        const canvas = document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, xOffset, 0, width, height, 0, 0, width, height);

        this.track = TrackLoader.fromImage(canvas, this.sampleSize);
        this.drawTrack();
    }
}
