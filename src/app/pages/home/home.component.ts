import { Component } from '@angular/core';
import { Prefab } from 'src/app/shared/prefab-parser/prefab';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent {

    objects: any[] = [];

    constructor() { }

    private parsePrefab(content: string): void {
        const prefab = new Prefab(content);
        this.objects = prefab.objects;
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
}
