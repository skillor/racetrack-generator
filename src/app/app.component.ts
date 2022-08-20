import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
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

    inputSeed = '';
    trackWidth = '1000';
    trackHeight = '1000';
    inputSegments = '200';
    outputSeed = '';
    generationTime = 0;

    private track!: Track;

    constructor() {

    }

    ngAfterViewInit(): void {
        this.trackCanvas = this.trackCanvasRef!.nativeElement;
        this.debugCanvas = this.debugCanvasRef!.nativeElement;

        this.generateTrack();
    }

    generateTrack() {
        const width = +this.trackWidth;
        const height = +this.trackHeight;

        this.debugCanvas!.width = width;
        this.debugCanvas!.height = height;

        this.trackCanvas!.width = width;
        this.trackCanvas!.height = height;

        this.track = new Track(
            this.debugCanvas!,
            this.trackCanvas!,
            [[[width * 0.5, height * 0.5], [width * 0.5 + 10, height * 0.5]]],
        );

        this.track.debugDrawGate(this.track.firstGate(), '#f80', '#088');

        this.addSegments();
    }

    addSegments() {
        const trackGenerator = new TrackGenerator(
            this.track,
            this.track.lastGate(),
            this.track.firstGate(),
            this.inputSeed,
        );

        trackGenerator.maxSegments = +this.inputSegments;

        this.outputSeed = trackGenerator.seed;

        this.generationTime = trackGenerator.generate();
    }
}
