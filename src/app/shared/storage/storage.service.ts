import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class StorageService {

    constructor() { }

    save(key: string, value: any): void {
        localStorage.setItem(key, value);
    }

    load(key: string, defaultValue: any = undefined): any {
        const value = localStorage.getItem(key);
        if (value === null) return defaultValue;
        return value;
    }
}
