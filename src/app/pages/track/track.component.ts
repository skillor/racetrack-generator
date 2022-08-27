import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as fflate from 'fflate';
import { PrefabObject } from 'src/app/shared/prefab-parser/prefab-object';
import { Prefab } from 'src/app/shared/prefab-parser/prefab';
import { StaticObject, StaticObjectType } from 'src/app/shared/prefab-parser/static-object';
import { StorageService } from 'src/app/shared/storage/storage.service';
import { GeneratorMode } from 'src/app/shared/track-generator/generator-modes';
import { Settings } from 'src/app/shared/track-generator/settings';
import { Track } from 'src/app/shared/track-generator/track';
import { TrackGenerator } from 'src/app/shared/track-generator/track-generator';

@Component({
    selector: 'app-track',
    templateUrl: './track.component.html',
    styleUrls: ['./track.component.scss']
})
export class TrackComponent implements AfterViewInit {

    @ViewChild('debugCanvas', { static: false })
    debugCanvasRef?: ElementRef<HTMLCanvasElement>;

    @ViewChild('trackCanvas', { static: false })
    trackCanvasRef?: ElementRef<HTMLCanvasElement>;

    @ViewChild('collisionCanvas', { static: false })
    collisionCanvasRef?: ElementRef<HTMLCanvasElement>;

    debugCanvas?: HTMLCanvasElement;
    trackCanvas?: HTMLCanvasElement;
    collisionCanvas?: HTMLCanvasElement;
    strokeSize: number;

    inputSeed: string;
    trackWidth: string;
    trackHeight: string;
    generatorMode: GeneratorMode;
    drawColor: string = '#fff';
    outputSeed = '';
    settings: Settings;
    generationTime = 0;
    generationIterations = 0;

    private track!: Track;

    startGate: string;
    endGate: string;

    prefabScale: string;

    deleteBarriers: string = '';

    prefabNames = [
        'westcoast_track_parkinglot.prefab',
        'westcoast_parking_garage.prefab',
    ];

    trackNamePrefix = 'racetrack_';
    amountTracks = 5;
    trackName: string;
    modIncludeTracks: string;

    constructor(
        private storageService: StorageService,
        private http: HttpClient,
    ) {
        this.trackName = this.trackNamePrefix + (Math.floor(Math.random() * this.amountTracks) + 1);
        this.modIncludeTracks = '';
        for (let i = 0; i < this.amountTracks; i++) {
            this.modIncludeTracks += this.trackNamePrefix + (i+1) + '\n';
        }

        this.prefabScale = this.storageService.load('prefab_scale', '2');

        this.strokeSize = this.storageService.load('stroke_size', '1');

        this.startGate = this.storageService.load('track_start', '[[50, 10], [50, 0]]');
        this.endGate = this.storageService.load('track_end', '[[60, 10], [60, 0]]');

        this.generatorMode = this.storageService.load('track_gen_mode', 'random');
        this.inputSeed = this.storageService.load('track_seed', '');
        this.trackWidth = this.storageService.load('track_width', '200');
        this.trackHeight = this.storageService.load('track_height', '200');
        this.settings = Settings.unserialize(this.storageService.load('track_settings', '{}'));
    }

    ngAfterViewInit(): void {
        this.trackCanvas = this.trackCanvasRef!.nativeElement;
        this.debugCanvas = this.debugCanvasRef!.nativeElement;
        this.collisionCanvas = this.collisionCanvasRef!.nativeElement;

        this.initCollisionCanvas();
        this.clearCollisions();
        this.generateTrack();
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

    private colorMatch(color1: Uint8ClampedArray, color2: Uint8ClampedArray): boolean {
        return color1[0] == color2[0] &&
            color1[1] == color2[1] &&
            color1[2] == color2[2];
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

    exportCollisions(): void {
        const a = document.createElement('a');
        const dt = this.collisionCanvas!.toDataURL('image/png');
        a.href = dt.replace(/^data:image\/[^;]/, 'data:application/octet-stream');
        a.download = 'track-' + new Date().toLocaleDateString('en-CA') + '.png';
        a.click();
    }

    importCollisions(): void {

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.png';
        input.style.display = 'none';
        document.body.appendChild(input);

        const onEnd = () => {
            document.body.removeChild(input);
        };

        input.onchange = () => {
            if (!input.files || input.files.length == 0 || input.files[0].size > 250000000 || !FileReader) {
                return onEnd();
            }
            const file = input.files[0];
            const fileReader = new FileReader();
            fileReader.onload = (e) => {
                if (!e.target || !e.target.result) {
                    return onEnd();
                }
                const img = new Image();
                img.onload = (e) => {
                    this.collisionCanvas!.getContext('2d')!.drawImage(img, 0, 0);
                };
                img.src = <string>e.target.result;
                onEnd();
            };
            fileReader.readAsDataURL(file);
        };
        input.click();
    }

    settingsAsAny(): any {
        return <any>this.settings;
    }

    saveConfig() {
        this.storageService.save('prefab_scale', this.prefabScale);

        this.storageService.save('stroke_size', this.strokeSize);

        this.storageService.save('track_start', this.startGate);
        this.storageService.save('track_end', this.endGate);

        this.storageService.save('track_gen_mode', this.generatorMode);
        this.storageService.save('track_seed', this.inputSeed);
        this.storageService.save('track_width', this.trackWidth);
        this.storageService.save('track_height', this.trackHeight);
        this.storageService.save('track_settings', this.settings.serialize());
    }

    setSize() {
        const width = +this.trackWidth;
        const height = +this.trackHeight;

        this.debugCanvas!.width = width;
        this.debugCanvas!.height = height;

        this.trackCanvas!.width = width;
        this.trackCanvas!.height = height;

        const context = this.collisionCanvas!.getContext('2d')!;

        const data = context.getImageData(0, 0, this.collisionCanvas!.width, this.collisionCanvas!.height);

        this.collisionCanvas!.width = width;
        this.collisionCanvas!.height = height;

        this.clearCollisions();

        context.putImageData(data, 0, 0);
    }

    generateTrack() {
        this.setSize();

        const width = +this.trackWidth;
        const height = +this.trackHeight;

        const context = this.collisionCanvas!.getContext('2d')!;

        const startGate = JSON.parse(this.startGate);
        const endGate = JSON.parse(this.endGate);

        const match = new Uint8ClampedArray([255, 255, 255]);
        const collisions: boolean[][] = new Array<boolean[]>(height);
        for (let y = 0; y < height; y++) {
            collisions[y] = new Array<boolean>(+this.trackWidth);
            for (let x = 0; x < width; x++) {
                collisions[y][x] = this.colorMatch(context.getImageData(x, y, 1, 1).data, match);
            }
        }

        this.track = new Track(
            width,
            height,
            collisions,
            this.debugCanvas!,
            this.trackCanvas!,
            [
                endGate,
                startGate,
            ],
        );

        Track.drawGate(this.track.debugCanvasContext, startGate, '#880', '#08f');
        Track.drawGate(this.track.debugCanvasContext, endGate, '#f80', '#088');

        this.addSegments();
    }

    addSegments() {
        const tStartGate = JSON.parse(this.startGate);
        const tEndGate = JSON.parse(this.endGate);

        this.saveConfig();

        let startGate = this.track.lastGate();
        if (startGate === undefined) startGate = tStartGate;

        const trackGenerator = new TrackGenerator(
            this.track,
            startGate,
            tEndGate,
            this.generatorMode,
            this.inputSeed,
            this.settings.copy(),
        );

        this.outputSeed = trackGenerator.seed;

        trackGenerator.generate(true).subscribe((gen) => {
            this.generationTime = gen[0];
            this.generationIterations = gen[1];

            this.track.drawTrack();
        });
    }

    deleteSegments() {
        this.saveConfig();

        this.track.deleteLastGates(+this.settings.maxSegments);

        this.track.drawTrack();
    }

    changeDeleteBarriers() {
        this.track.deletedBarriers = this.deleteBarriers.split(',').map((v) => +v);
        this.track.drawTrack();
    }

    prefab?: Prefab = undefined;

    private parsePrefab(content: string): void {
        this.prefab = Prefab.createByContent(content);
        this.trackWidth = '' + Math.round(this.prefab.size[0] * +this.prefabScale);
        this.trackHeight = '' + Math.round(this.prefab.size[1] * +this.prefabScale);

        this.clearCollisions();
        this.setSize();
        this.clearCollisions('#fff');
        const points = this.prefab!.getSortedBounds().map((o) => PrefabObject.pointFromPrefab([o.pos![0], o.pos![1]], +this.prefabScale, this.prefab));
        Track.drawPolygon(this.collisionCanvas!.getContext('2d')!, points, '#000');
    }

    importPrefab(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.prefab';
        input.style.display = 'none';
        document.body.appendChild(input);

        const onEnd = () => {
            document.body.removeChild(input);
        };

        input.onchange = () => {
            if (!input.files || input.files.length == 0 || input.files[0].size > 250000000 || !FileReader) {
                return onEnd();
            }
            const file = input.files[0];
            const fileReader = new FileReader();
            fileReader.onload = (e) => {
                if (!e.target || !e.target.result) {
                    return onEnd();
                }
                let content: string;
                if (typeof e.target.result === 'string') {
                    content = e.target.result;
                } else {
                    content = new TextDecoder().decode(e.target.result);
                }

                try {
                    this.parsePrefab(content);
                } catch (err) {
                    console.error(err);
                }
                onEnd();
            };
            fileReader.readAsText(file);
        };
        input.click();
    }

    loadPrefab(name: string) {
        this.http.get('./assets/prefabs/' + name, { responseType: 'text' }).subscribe((content) => {
            try {
                this.parsePrefab(content);

                this.autoCollision();
                this.autoStartEnd();
            } catch (err) {
                console.error(err);
            }
        });
    }

    objectTypes(): StaticObjectType[] {
        return Object.values(StaticObject.shapeTypes);
    }

    autoCollision() {
        if (this.prefab === undefined) return;
        for (let obj of this.prefab.objects) {
            if (obj.isCollision()) this.makeCollision(obj);
        }
    }

    autoStartEnd() {
        if (this.prefab === undefined) return;
        for (let obj of this.prefab.objects) {
            if (obj.isStartObject()) this.useAsStart(obj);
            if (obj.isEndObject()) this.useAsEnd(obj);
        }
    }


    makeCollision(obj: PrefabObject): void {
        const sobj = <StaticObject>obj;
        if (sobj.hasOwnProperty('shapeType') && sobj.shapeType === undefined) return;
        const box = sobj.get2DBox(+this.prefabScale, this.prefab);
        Track.drawPolygon(this.collisionCanvas!.getContext('2d'), box, '#fff');
    }

    useAsStart(obj: PrefabObject): void {
        const pos = PrefabObject.pointFromPrefab([obj.pos![0], obj.pos![1]], +this.prefabScale, this.prefab);
        const angle = -obj.rot![2];
        this.startGate = JSON.stringify(
            TrackGenerator.pointToGate(<any>pos, angle, (+this.settings.minGateHalfSize + +this.settings.maxGateHalfSize) / 2, true)
        );
    }

    useAsEnd(obj: PrefabObject): void {
        const pos = PrefabObject.pointFromPrefab([obj.pos![0], obj.pos![1]], +this.prefabScale, this.prefab);
        const angle = -obj.rot![2];
        this.endGate = JSON.stringify(
            TrackGenerator.pointToGate(<any>pos, angle, (+this.settings.minGateHalfSize + +this.settings.maxGateHalfSize) / 2, true)
        );
    }

    exportPrefab(obj: StaticObjectType): void {
        const prefab = Prefab.createByTrack(this.track, +this.prefabScale, obj, this.prefab,);
        const blob = new Blob([prefab.content], {
            type: 'text/plain',
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'track-' + new Date().toLocaleDateString('en-CA') + '.prefab';
        a.click();
    }

    levelName = 'west_coast_usa';

    jsonLines(...objects: any[]) {
        return objects.map((o: any) => JSON.stringify(o)).join('\n');
    }

    exportMod(obj: StaticObjectType): void {
        const prefab = Prefab.createByTrack(this.track, +this.prefabScale, obj, this.prefab,);

        const zipped = fflate.zipSync({
            ['levels/' + this.levelName + '/main/items.level.json']:
                fflate.strToU8(this.jsonLines(
                    {"name":"MissionGroup","class":"SimGroup","enabled":"1",'persistentId': Prefab.createPersitentId()},
                    {"name":"GeneratedTracks","class":"SimGroup","enabled":"1",'persistentId': Prefab.createPersitentId()},
                 )),
            ['levels/' + this.levelName + '/main/GeneratedTracks/items.level.json']:
                fflate.strToU8(this.jsonLines(
                    ...this.modIncludeTracks.split('\n').filter((v) => v).map((v) => {
                        return {"name":v,"class":"SimGroup","__parent":"GeneratedTracks","groupPosition":"0 0 0",'persistentId': Prefab.createPersitentId()};
                    })
                )),
            ['levels/' + this.levelName + '/main/GeneratedTracks/' + this.trackName + '/items.level.json']:
                fflate.strToU8(prefab.toJson(this.trackName)),
        }, {
            level: 1,
            mtime: new Date()
        });

        const blob = new Blob([zipped], {
            type: 'application/zip',
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = this.trackName + '.zip';
        a.click();
    }
}
