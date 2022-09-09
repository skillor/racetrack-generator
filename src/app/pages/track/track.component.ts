import { Component, QueryList, ViewChildren } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as fflate from 'fflate';
import { PRESETS, Prefab } from 'src/app/shared/prefab-parser/prefab';
import { StaticObject, StaticObjectType } from 'src/app/shared/prefab-parser/static-object';
import { StorageService } from 'src/app/shared/storage/storage.service';
import { GeneratorMode } from 'src/app/shared/track-generator/generator-modes';
import { Settings } from 'src/app/shared/track-generator/settings';
import { Track } from 'src/app/shared/track-generator/track';
import { LevelComponent } from 'src/app/components/level/level.component';

@Component({
    selector: 'app-track',
    templateUrl: './track.component.html',
    styleUrls: ['./track.component.scss']
})
export class TrackComponent {

    strokeSize: number;

    inputSeed: string;
    generatorMode: GeneratorMode;
    tracks: {[levelKey: string]: Track} = {};
    drawColor: string = '#fff';
    outputSeed = '';
    generationTime = 0;
    generationIterations = 0;

    prefabScale: string;
    importSampleSize: string = '10';

    trackNamePrefix = 'racetrack_';
    amountTracks = 5;
    trackName: string;
    modIncludeTracks: string;
    exportObjectType: string = this.objectValues()[0].shapeName;
    repeatObject = true;

    exportTranslateX: string = '0';
    exportTranslateY: string = '0';
    exportTranslateZ: string = '0';

    exportScaleX: string = '1';
    exportScaleY: string = '1';
    exportScaleZ: string = '1';

    prefab?: Prefab = undefined;

    @ViewChildren('level') levelComponents?: QueryList<LevelComponent>;

    settings?: Settings;
    startGate = '';
    endGate = '';

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

        this.generatorMode = this.storageService.load('track_gen_mode', 'random');
        this.inputSeed = this.storageService.load('track_seed', '');
    }

    saveConfig() {
        this.storageService.save('prefab_scale', this.prefabScale);
        this.storageService.save('stroke_size', this.strokeSize);
        this.storageService.save('track_gen_mode', this.generatorMode);
        this.storageService.save('track_seed', this.inputSeed);
    }

    presets(): string[] {
        return PRESETS;
    }

    settingsAsAny(): any {
        return this.settings;
    }

    getLevelComponent(levelKey: string): LevelComponent | undefined {
        for (let c of this.levelComponents!) {
            if (c.levelKey == levelKey) return c;
        }
        return undefined;
    }

    loadLevelSettings(levelKey: string) {
        const c = this.getLevelComponent(levelKey);
        if (c === undefined) return;
        c.loadConfig();
        this.startGate = c.startGate;
        this.endGate = c.endGate;
        this.settings = c.settings;
    }

    saveAllSettings() {
        for (let c of this.levelComponents!) {
            if (this.settings !== undefined) c.settings = this.settings;
            c.saveConfig();
        }
    }

    saveLevelSettings(levelKey: string) {
        const c = this.getLevelComponent(levelKey);
        if (c === undefined) return;
        c.startGate = this.startGate;
        c.endGate = this.endGate;
        if (this.settings !== undefined) c.settings = this.settings;
        c.saveConfig();
    }

    generateTracks(): void {
        this.saveConfig();
        if (this.inputSeed === '') {
            this.outputSeed = ('' + Math.random()).substring(2);
        } else {
            this.outputSeed = this.inputSeed;
        }

        if (!this.levelComponents) return;
        for (let comp of this.levelComponents!) {
            comp.generateTrack();
        }
    }

    mergeCanvy(canvy: HTMLCanvasElement[]): HTMLCanvasElement {
        let width = 0;
        let height = 0;

        for (let c of canvy) {
            width += c.width;
            height = Math.max(height, c.height);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        let x = 0;
        for (let c of canvy) {
            ctx!.putImageData(c.getContext('2d')?.getImageData(0, 0, c.width, c.height)!, x, 0);
            x += c.width;
        }
        return canvas;
    }

    exportCollisions(): void {
        if (!this.levelComponents) return;
        const canvas = this.mergeCanvy(this.levelComponents.map((c) => c.collisionCanvas!));

        const a = document.createElement('a');
        const dt = canvas.toDataURL('image/png');
        a.href = dt.replace(/^data:image\/[^;]/, 'data:application/octet-stream');
        a.download = 'collisions-' + new Date().toLocaleDateString('en-CA') + '.png';
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
                    if (!this.levelComponents) return;
                    let x = 0;
                    for (let c of this.levelComponents) {
                        c.importCollision(img, x);
                        x += +c.trackWidth;
                    }
                };
                img.src = <string>e.target.result;
                onEnd();
            };
            fileReader.readAsDataURL(file);
        };
        input.click();
    }

    private parsePrefab(content: string): void {
        this.prefab = Prefab.createByContent(content);
    }

    exportTrack(): void {
        if (!this.levelComponents) return;
        const canvas = this.mergeCanvy(this.levelComponents.map((c) => c.createTrackCanvas()));

        const a = document.createElement('a');
        const dt = canvas.toDataURL('image/png');
        a.href = dt.replace(/^data:image\/[^;]/, 'data:application/octet-stream');
        a.download = 'track-' + new Date().toLocaleDateString('en-CA') + '.png';
        a.click();
    }

    importTrack(): void {
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
                    if (!this.levelComponents) return;
                    let x = 0;
                    for (let c of this.levelComponents) {
                        c.importTrack(img, x);
                        x += +c.trackWidth;
                    }
                };
                img.src = <string>e.target.result;
                onEnd();
            };
            fileReader.readAsDataURL(file);
        };
        input.click();
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
            } catch (err) {
                console.error(err);
            }
        });
    }

    objectValues(): StaticObjectType[] {
        return Object.values(StaticObject.shapeTypes);
    }

    getTracks(): {[levelKey: string]: Track} {
        return Object.fromEntries(this.levelComponents!.map((o) => [o.levelKey, o.track!]));
    }

    private createPrefab(): Prefab {
        const type = StaticObject.shapeTypes[this.exportObjectType];
        const prefab = Prefab.createByTracks(
            this.getTracks(),
            +this.prefabScale,
            type,
            this.prefab,
            this.repeatObject,
            [+this.exportScaleX, +this.exportScaleY, +this.exportScaleZ],
        );
        prefab.translate([+this.exportTranslateX, +this.exportTranslateY, +this.exportTranslateZ]);
        prefab.stringify();
        return prefab;
    }

    exportPrefab(): void {
        const prefab = this.createPrefab();
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

    exportMod(): void {
        const prefab = this.createPrefab();
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
