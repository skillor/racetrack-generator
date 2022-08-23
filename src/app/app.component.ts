import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { StorageService } from './shared/storage/storage.service';
import { GeneratorMode } from './shared/track-generator/generator-modes';
import { Line } from './shared/track-generator/line';
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

    debugCanvas?: HTMLCanvasElement;
    trackCanvas?: HTMLCanvasElement;

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
        this.generatorMode = this.storageService.load('track_gen_mode', 'random');
        this.inputSeed = this.storageService.load('track_seed', '');
        this.trackWidth = this.storageService.load('track_width', '200');
        this.trackHeight = this.storageService.load('track_height', '200');
        this.settings = Settings.unserialize(this.storageService.load('track_settings', '{}'));
    }

    ngAfterViewInit(): void {
        this.trackCanvas = this.trackCanvasRef!.nativeElement;
        this.debugCanvas = this.debugCanvasRef!.nativeElement;

        this.generateTrack();
    }

    settingsAsAny(): any {
        return <any>this.settings;
    }

    saveConfig() {
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

        const startGate = JSON.parse(this.startGate);
        const endGate = JSON.parse(this.endGate);

        this.track = new Track(
            width,
            height,
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
