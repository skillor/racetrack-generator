import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { StorageService } from './shared/storage/storage.service';
import { GeneratorMode } from './shared/track-generator/generator-modes';
import { Settings } from './shared/track-generator/settings';
import { Track } from './shared/track-generator/track';
import { TrackGenerator } from './shared/track-generator/track-generator';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
    @ViewChild('debugCanvas', {static: false})
    debugCanvasRef?: ElementRef<HTMLCanvasElement>;

    @ViewChild('trackCanvas', {static: false})
    trackCanvasRef?: ElementRef<HTMLCanvasElement>;

    @ViewChild('collisionCanvas', {static: false})
    collisionCanvasRef?: ElementRef<HTMLCanvasElement>;

    debugCanvas?: HTMLCanvasElement;
    trackCanvas?: HTMLCanvasElement;
    collisionCanvas?: HTMLCanvasElement;
    strokeSize: number;

    inputSeed: string;
    trackWidth: string;
    trackHeight: string;
    generatorMode: GeneratorMode;
    outputSeed = '';
    settings: Settings;
    generationTime = 0;
    generationIterations = 0;

    private track!: Track;

    startGate: string = '[[50, 10], [50, 0]]';
    endGate: string = '[[60, 10], [60, 0]]';

    constructor(private storageService: StorageService) {
        this.strokeSize = this.storageService.load('stroke_size', '1');

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
    private prevX = 0;
    private prevY = 0;
    private currX = 0;
    private currY = 0;

    private canvasXY(res: string, e: MouseEvent): void {
        if (res == 'down') {
            this.prevX = this.currX;
            this.prevY = this.currY;
            this.currX = e.clientX - this.collisionCanvas!.offsetLeft;
            this.currY = e.clientY - this.collisionCanvas!.offsetTop;

            this.mouseDown = true;
        } else if (res == 'up') {
            this.mouseDown = false;
        } else if (res == 'out') {
            this.mouseDown = false;
        } else if (res == 'move') {
            if (this.mouseDown) {
                this.prevX = this.currX;
                this.prevY = this.currY;
                this.currX = e.clientX - this.collisionCanvas!.offsetLeft;
                this.currY = e.clientY - this.collisionCanvas!.offsetTop;

                this.drawCanvas();
            }
        }
    }

    private colorMatch(color1: Uint8ClampedArray, color2: Uint8ClampedArray): boolean {
        return color1[0] == color2[0] &&
            color1[1] == color2[1] &&
            color1[2] == color2[2];
    }

    private drawCanvas(): void {
        const ctx = this.collisionCanvas!.getContext('2d');
        ctx!.beginPath();
        ctx!.moveTo(this.prevX, this.prevY);
        ctx!.lineTo(this.currX, this.currY);
        ctx!.strokeStyle = '#fff';
        ctx!.lineWidth = +this.strokeSize;
        ctx!.stroke();
        ctx!.closePath();
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

        const data = this.collisionCanvas!.getContext('2d')!.getImageData(0, 0, this.collisionCanvas!.width, this.collisionCanvas!.height);

        this.collisionCanvas!.width = width;
        this.collisionCanvas!.height = height;

        this.collisionCanvas!.getContext('2d')!.putImageData(data, 0, 0);

        const startGate = JSON.parse(this.startGate);
        const endGate = JSON.parse(this.endGate);

        const context = this.collisionCanvas!.getContext('2d')!;
        const match =  new Uint8ClampedArray([255, 255, 255]);
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
}
