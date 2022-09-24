export class Race {
    nodes: [number, number, number, number][];

    constructor(
        nodes: [number, number, number, number][],
    ) {
        this.nodes = nodes;
    }

    static fromRaceData(data: any): Race {
        const pathnodes: {[key: number]: [number, number, number, number]} = {};
        for (let pathnode of data.pathnodes) {
            pathnodes[pathnode.oldId] = [pathnode['pos'][0], pathnode['pos'][1], pathnode['pos'][2], pathnode['radius']];
        }

        const nodes: [number, number, number, number][] = [];
        if (Object.keys(data.segments).length == 0) return new Race(Object.values(pathnodes));
        for (const segment of data.segments) {
            nodes.push(pathnodes[segment.from])
        }
        return new Race(nodes);
    }

    toRaceData(): any {
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
                    0,
                    0,
                ],
                "visible": true,
            });
        }

        const segments: any[] = [];
        for (let i = 1; i < this.nodes.length; i++) {
            segments.push({
                "capsules": {},
                "from": i,
                "mode": "waypoint",
                "name": "Segment " + i,
                "oldId": i,
                "to": (i == this.nodes.length - 1 ? 1 : i + 1),
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
            "defaultStartPosition": 2,
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
            "startNode": 3,
            "startPositions": [
                {
                    "rot": [
                        0,
                        0,
                        0,
                        0,
                    ],
                    "name": "Start Position 1",
                    "oldId": 2,
                    "pos": [
                        this.nodes[0][0],
                        this.nodes[0][1],
                        this.nodes[0][2],
                    ]
                },
            ]
        };
    }

    toHotlapData(): any {
        const checkpoints: any[] = [];
        for (let i = 0; i < this.nodes.length; i++) {
            checkpoints.push({
                "size": [
                    this.nodes[i][3] + 5,
                    this.nodes[i][3] + 5,
                    8,
                ],
                "position": [
                    this.nodes[i][0],
                    this.nodes[i][1],
                    this.nodes[i][2],
                ],
            });
        }
        return checkpoints;
    }
}
