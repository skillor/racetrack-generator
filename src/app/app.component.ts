import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { StorageService } from './shared/storage/storage.service';
import { GeneratorMode } from './shared/track-generator/generator-modes';
import { Line } from './shared/track-generator/line';
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

    debugCanvas?: HTMLCanvasElement;
    trackCanvas?: HTMLCanvasElement;

    inputSeed: string;
    trackWidth: string;
    trackHeight: string;
    inputSegments: string;
    generatorMode: GeneratorMode;
    outputSeed = '';
    generationTime = 0;
    generationIterations = 0;

    private track!: Track;

    startGate: Line = [[500, 500], [510, 500]];
    endGate: Line = [[10, 10], [10 + 10, 10]];

    constructor(private storageService: StorageService) {
        this.generatorMode = this.storageService.load('track_gen_mode', 'random');
        this.inputSeed = this.storageService.load('track_seed', '');
        this.trackWidth = this.storageService.load('track_width', '200');
        this.trackHeight = this.storageService.load('track_height', '200');
        this.inputSegments = this.storageService.load('track_segments', '2');
    }

    ngAfterViewInit(): void {
        this.trackCanvas = this.trackCanvasRef!.nativeElement;
        this.debugCanvas = this.debugCanvasRef!.nativeElement;

        this.generateTrack();
    }

    saveConfig() {
        this.storageService.save('track_gen_mode', this.generatorMode);
        this.storageService.save('track_seed', this.inputSeed);
        this.storageService.save('track_width', this.trackWidth);
        this.storageService.save('track_height', this.trackHeight);
        this.storageService.save('track_segments', this.inputSegments);
    }

    generateTrack() {
        const width = +this.trackWidth;
        const height = +this.trackHeight;

        this.startGate = [[width * 0.5, height * 0.5], [width * 0.5 + 10, height * 0.5]];
        this.endGate = [[width * 0.5, height * 0.5 + 10], [width * 0.5 + 10, height * 0.5 + 10]];

        this.debugCanvas!.width = width;
        this.debugCanvas!.height = height;

        this.trackCanvas!.width = width;
        this.trackCanvas!.height = height;

        this.track = new Track(
            width,
            height,
            this.debugCanvas!,
            this.trackCanvas!,
            [
                this.endGate,
                this.startGate,
            ],
        );

        this.track.drawGate(this.track.debugCanvasContext, this.startGate, '#880', '#08f');
        this.track.drawGate(this.track.debugCanvasContext, this.endGate, '#f80', '#088');

        this.addSegments();
    }

    addSegments() {
        this.saveConfig();

        let startGate = this.track.lastGate();
        if (startGate === undefined) startGate = this.startGate;

        const trackGenerator = new TrackGenerator(
            this.track,
            startGate,
            this.endGate,
            this.generatorMode,
            this.inputSeed,
        );

        trackGenerator.maxSegments = +this.inputSegments;

        this.outputSeed = trackGenerator.seed;

        const gen = trackGenerator.generate();
        this.generationTime = gen[0];
        this.generationIterations = gen[1];

        this.track.drawTrack();
    }

    deleteSegments() {
        this.saveConfig();

        this.track.deleteLastGates(+this.inputSegments);

        this.track.drawTrack();
    }
}
