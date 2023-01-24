/// <reference lib="webworker" />

import { TrackGenerator } from "./track-generator";

addEventListener('message', ({ data }) => {
    if (data.type === 'start') {
        const tg = TrackGenerator.unserialize(data.trackGenerator);
        tg.progressEmitter = (data: any) => postMessage(data, []);
        postMessage(tg.findTrackDFS());
    } else {
        console.log('stop');
    }
});
