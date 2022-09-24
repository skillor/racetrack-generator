import * as fflate from 'fflate';
import { Track } from '../track-generator/track';
import { GameplayMission } from './gameplay-mission';
import { Prefab } from "./prefab";

export class ModExporter {
    static jsonLines(...objects: any[]): string {
        return objects.map((o: any) => JSON.stringify(o)).join('\n');
    }

    static createModZip(
        prefab: Prefab,
        levelName: string,
        trackName: string,
        modIncludeTracks: string,
    ): Uint8Array {
        const zip = {
            ['levels/' + levelName + '/main/items.level.json']:
                fflate.strToU8(this.jsonLines(
                    { "name": "MissionGroup", "class": "SimGroup", "enabled": "1", 'persistentId': Prefab.createPersitentId() },
                    { "name": "GeneratedTracks", "class": "SimGroup", "enabled": "1", 'persistentId': Prefab.createPersitentId() },
                )),
            ['levels/' + levelName + '/main/GeneratedTracks/items.level.json']:
                fflate.strToU8(this.jsonLines(
                    ...modIncludeTracks.split('\n').filter((v) => v).map((v) => {
                        return { "name": v, "class": "SimGroup", "__parent": "GeneratedTracks", "groupPosition": "0 0 0", 'persistentId': Prefab.createPersitentId() };
                    })
                )),
            ['levels/' + levelName + '/main/GeneratedTracks/' + trackName + '/items.level.json']:
                fflate.strToU8(prefab.toJson(trackName)),
        };

        if (prefab.mission) {
            zip['gameplay/missions/' + levelName + '/aiRace/' + trackName + '/info.json'] = fflate.strToU8(JSON.stringify(prefab.mission.getInfo()));
            zip['gameplay/missions/' + levelName + '/aiRace/' + trackName + '/race.race.json'] = fflate.strToU8(JSON.stringify(prefab.mission.getRace()));
            zip['settings/hotlapping/info/' + levelName + '-' + trackName + '.json'] = fflate.strToU8(JSON.stringify(prefab.mission.getHotlap()));
        }

        return fflate.zipSync(zip, {
            level: 1,
            mtime: new Date(),
        });
    }
}
