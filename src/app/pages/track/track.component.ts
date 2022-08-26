import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
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

    constructor(private storageService: StorageService) {
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

    clearCollisions(): void {
        this.collisionCanvas!.width = this.collisionCanvas!.width;
        const ctx = this.collisionCanvas!.getContext('2d')!;
        ctx.fillStyle = '#000';
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
        this.storageService.save('stroke_size', this.strokeSize);

        this.storageService.save('track_start', this.startGate);
        this.storageService.save('track_end', this.endGate);

        this.storageService.save('track_gen_mode', this.generatorMode);
        this.storageService.save('track_seed', this.inputSeed);
        this.storageService.save('track_width', this.trackWidth);
        this.storageService.save('track_height', this.trackHeight);
        this.storageService.save('track_settings', this.settings.serialize());
    }

    generateTrack() {
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

        const startGate = JSON.parse(this.startGate);
        const endGate = JSON.parse(this.endGate);

        const match = new Uint8ClampedArray([255, 255, 255]);
        const collisions: boolean[][] = new Array<boolean[]>(height);
        for (let y = 0; y < height; y++) {
            collisions[y] = new Array<boolean>(width);
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

        this.track.drawGate(this.track.debugCanvasContext, startGate, '#880', '#08f');
        this.track.drawGate(this.track.debugCanvasContext, endGate, '#f80', '#088');

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

    prefab?: Prefab = undefined;
    prefabScale: string = '5';

    private prefabPointToPoint(p: number[]): number[] {
        const scale = +this.prefabScale;
        const r: number[] = [];
        for (let i = 0; i < p.length; i++) {
            r.push(Math.round((p[i] - this.prefab!.minPos[i]) * scale));
        }
        return r;
    }

    private parsePrefab(content: string): void {
        this.prefab = Prefab.createByContent(content);
        this.trackWidth = '' + Math.round(this.prefab.size[0] * +this.prefabScale);
        this.trackHeight = '' + Math.round(this.prefab.size[1] * +this.prefabScale);
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

    objectNames(): StaticObjectType[] {
        return StaticObject.types;
    }

    useAsStart(obj: PrefabObject): void {
        const pos = this.prefabPointToPoint([obj.pos![0], obj.pos![1]]);
        const angle = obj.rot![2];
        this.startGate = JSON.stringify(
            TrackGenerator.pointToGate(<any>pos, angle, (+this.settings.minGateHalfSize + +this.settings.maxGateHalfSize) / 2, true)
        );
    }

    useAsEnd(obj: PrefabObject): void {
        const pos = this.prefabPointToPoint([obj.pos![0], obj.pos![1]]);
        const angle = obj.rot![2];
        this.endGate = JSON.stringify(
            TrackGenerator.pointToGate(<any>pos, angle, (+this.settings.minGateHalfSize + +this.settings.maxGateHalfSize) / 2, true)
        );
    }

    exportPrefab(obj: StaticObjectType): void {
        const prefab = Prefab.createByTrack(this.track, +this.prefabScale, obj, this.prefab);
        const blob = new Blob([prefab.content], {
            type: 'text/plain',
        });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank')!.focus();
    }
}
