import { Component } from '@angular/core';
import { Prefab } from 'src/app/shared/prefab-parser/prefab';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent {
    constructor() { }

    prefab?: Prefab;
    fileName: string = '';
    translateX: string = '0';
    translateY: string = '0';
    translateZ: string = '0';

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
            this.fileName = file.name;
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
                    this.prefab = Prefab.createByContent(content);
                } catch (err) {
                    console.error(err);
                }
                onEnd();
            };
            fileReader.readAsText(file);
        };
        input.click();
    }

    translate(factor = 1): void {
        if (!this.prefab) return;

        this.prefab.translate([+this.translateX * factor, +this.translateY * factor, +this.translateZ * factor]);

        this.prefab.stringify();
    }

    exportPrefab(): void {
        if (!this.prefab) return;

        this.translate(1);

        const blob = new Blob([this.prefab.content], {
            type: 'text/plain',
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = this.fileName;
        a.click();

        this.translate(-1);
    }
}
