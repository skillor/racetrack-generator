import { Track } from "../track-generator/track";
import { Race } from "./race";

export class GameplayMission {
    levelName: string;
    trackName: string;
    nodes: [number, number, number, number][];

    constructor(
        levelName: string,
        trackName: string,
        nodes: [number, number, number, number][],
    ) {
        this.levelName = levelName;
        this.trackName = trackName;
        this.nodes = nodes;
    }

    getInfo(): any {
        return {
            "additionalAttributes": {},
            "customAdditionalAttributes": {},
            "description": "Mission Description",
            "grouping": {
                "id": "",
                "label": ""
            },
            "missionType": "aiRace",
            "missionTypeData": {
                "allowVehicleChoice": false,
                "camPathActive": false,
                "completeText": "For Example, 'Well done!'",
                "damageFailActive": false,
                "damageLimit": 10000,
                "finishText": "For Example, 'Finish!'",
                "lapCount": 6,
                "passText": "For Example, 'Good, but not the best!'",
                "placementGoal": 1,
                "playerConfig": "race",
                "playerConfigPath": "/vehicles/coupe/race.pc",
                "playerModel": "coupe",
                "prefabActive": false,
                "presetVehicleActive": false,
                "raceFailText": "For Example, 'You got wrecked!'",
                "raceFile": "/gameplay/missions/" + this.levelName + "/aiRace/" + this.trackName + "/race.race.json",
                "racerAggression": 1,
                "racerAwareness": true,
                "racerCount": 5,
                "racerRubberbandMode": false,
                "randomizeAiParams": true,
                "shuffleGroup": false,
                "startText": "For Example, 'Race against tough opponents!'",
                "startTitle": "For Example, 'My Mission Name'",
                "stoppedLimit": 0,
                "timeOfDay": 15,
                "timeOfDayActive": false,
                "useGroundmarkers": false,
                "vehicleGroupActive": false
            },
            "name": "Name",
            "retryBehaviour": "infiniteRetries",
            "startCondition": {
                "type": "always"
            },
            "startTrigger": {
                "level": this.levelName,
                "pos": [
                    this.nodes[0][0],
                    this.nodes[0][1],
                    this.nodes[0][2],
                ],
                "radius": this.nodes[0][3],
                "rot": [
                    0,
                    0,
                    0,
                    1
                ],
                "type": "coordinates"
            },
            "visibleCondition": {
                "type": "always"
            }
        };
    }

    getRace(): any {
        return new Race(this.nodes.slice(1)).toRaceData();
    }

    getHotlap(): any {
        return new Race(this.nodes.slice(1)).toHotlapData();
    }
}
