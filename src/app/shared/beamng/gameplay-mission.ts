import { Track } from "../track-generator/track";

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
        const pathnodes: any[] = [];
        for (let i = 0; i < this.nodes.length; i++) {
            pathnodes.push({
                "customFields": {
                    "values": {},
                    "names": {},
                    "tags": {},
                    "types": {}
                },
                "mode": "manual",
                "name": "Pathnode " + (i + 1),
                "navRadiusScale": 1,
                "normal": [
                    0,
                    0,
                    0,
                ],
                "oldId": i + 1,
                "pos": [
                    this.nodes[i][0],
                    this.nodes[i][1],
                    this.nodes[i][2],
                ],
                "radius": this.nodes[i][3],
                "recovery": -1,
                "reverseRecovery": -1,
                "sidePadding": [
                    1,
                    3,
                ],
                "visible": true,
            });
        }

        const segments: any[] = [];
        for (let i = 0; i < this.nodes.length; i++) {
            segments.push({
                "capsules": {},
                "from": i + 1,
                "mode": "waypoint",
                "name": "Segment " + (i + 1),
                "oldId": i + 1,
                "to": (i == this.nodes.length - 1 ? 1 : i + 2),
            });
        }

        return {
            "authors": "Anonymous",
            "classification": {
                "reversible": false,
                "allowRollingStart": false,
                "branching": false,
                "closed": true
            },
            "date": 1662908006,
            "defaultLaps": 2,
            "defaultStartPosition": 1,
            "description": "Description",
            "difficulty": 24,
            "endNode": -1,
            "forwardPrefabs": {},
            "hideMission": false,
            "name": "Path",
            "pacenotes": {},
            "pathnodes": pathnodes,
            "prefabs": {},
            "reversePrefabs": {},
            "reverseStartPosition": -1,
            "rollingReverseStartPosition": -1,
            "rollingStartPosition": -1,
            "segments": segments,
            "startNode": 1,
            "startPositions": [
                {
                    "rot": [
                        0,
                        0,
                        0,
                        0,
                    ],
                    "name": "Start Position 1",
                    "oldId": 1,
                    "pos": [
                        this.nodes[0][0],
                        this.nodes[0][1],
                        this.nodes[0][2],
                    ]
                },
            ]
        };
    }
}
