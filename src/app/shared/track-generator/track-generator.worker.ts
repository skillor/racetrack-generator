/// <reference lib="webworker" />

import { TrackGenerator } from "./track-generator";

addEventListener('message', ({ data }) => {
    const tg = TrackGenerator.unserialize(data.trackGenerator);
    postMessage(tg.findTrackDFS());
});
