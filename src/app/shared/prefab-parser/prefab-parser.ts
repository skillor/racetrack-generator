import { parse } from './parser.js';

export class PrefabParser {
    static parse(content: string) {
        // parser.
        console.log(content);
        try {
            console.log(parse(content));
        } catch (err) {
            console.log(err);
        }
    }
}
