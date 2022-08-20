import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Track } from './shared/track-generator/track';
import { TrackGenerator } from './shared/track-generator/track-generator';
import { TrackGeneratorService } from './shared/track-generator/track-generator.service';

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

    constructor(private trackGeneratorService: TrackGeneratorService) {

    }

    ngAfterViewInit(): void {
        this.trackCanvas = this.trackCanvasRef!.nativeElement;
        this.debugCanvas = this.debugCanvasRef!.nativeElement;

        const width = 1000;
        const height = 1000;

        this.debugCanvas.width = width;
        this.debugCanvas.height = height;

        this.trackCanvas.width = width;
        this.trackCanvas.height = height;

        const track = new Track(
            this.debugCanvas,
            this.trackCanvas,
            [[[500, 500], [500, 510]]],
        );

        const trackGenerator = new TrackGenerator(
            track,
            track.lastGate(),
            track.lastGate(),
        );

        trackGenerator.generate();
    }
}
