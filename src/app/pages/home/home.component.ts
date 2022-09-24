import { Component } from '@angular/core';
import { Prefab } from 'src/app/shared/beamng/prefab';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Delaunator from 'delaunator';
import { Race } from 'src/app/shared/beamng/race';

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

    convertRaceToHotlap(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.race.json';
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
            let fileName = file.name;
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
                    const race = Race.fromRaceData(JSON.parse(content));
                    const blob = new Blob([JSON.stringify(race.toHotlapData())], {
                        type: 'text/plain',
                    });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = fileName.split('.')[0] + '.json';
                    a.click();
                } catch (err) {
                    console.error(err);
                }
                onEnd();
            };
            fileReader.readAsText(file);
        };
        input.click();
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
                    this.debug();
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

    debug() {
        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(60, 1, 1, 1000);
        camera.position.setScalar(150);
        var renderer = new THREE.WebGLRenderer({
            antialias: true,
        });
        var canvas = renderer.domElement;
        canvas.style.width = '100%';
        document.body.appendChild(canvas);

        var controls = new OrbitControls(camera, canvas);

        var light = new THREE.DirectionalLight(0xffffff, 1.5);
        light.position.setScalar(100);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        var points3d = [];

        const level = Object.values(this.prefab!.levels)[0];
        const objs = level.objects;
        for (let obj of objs) {
            if (!obj.isSpecial()) points3d.push(new THREE.Vector3(
                obj.pos![0] - level.minPos[0] - level.size[0] * 0.5,
                obj.pos![1] - level.minPos[1] - level.size[1] * 0.5,
                obj.pos![2] - level.minPos[2] - level.size[2] * 0.5,
            ));
        }

        var geom = new THREE.BufferGeometry().setFromPoints(points3d);
        var cloud = new THREE.Points(
            geom,
            new THREE.PointsMaterial({ color: 0x99ccff, size: 2 })
        );
        scene.add(cloud);

        // triangulate x, z
        var indexDelaunay = Delaunator.from(
            points3d.map(v => {
                return [v.x, v.y, v.z];
            })
        );

        var meshIndex = []; // delaunay index => three.js index
        for (let i = 0; i < indexDelaunay.triangles.length; i++){
            meshIndex.push(indexDelaunay.triangles[i]);
        }

        geom.setIndex(meshIndex); // add three.js index to the existing geometry
        geom.computeVertexNormals();
        var mesh = new THREE.Mesh(
            geom, // re-use the existing geometry
            new THREE.MeshLambertMaterial({ color: "purple", wireframe: true })
        );

        var ray = new THREE.Raycaster(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
        var collisionResults = ray.intersectObject( mesh );
        console.log(collisionResults);

        scene.add(mesh);

        render();

        function resize(renderer: THREE.WebGLRenderer) {
            const canvas = renderer.domElement;
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            const needResize = canvas.width !== width || canvas.height !== height;
            if (needResize) {
                renderer.setSize(width, height, false);
            }
            return needResize;
        }

        function render() {
            if (resize(renderer)) {
                camera.aspect = canvas.clientWidth / canvas.clientHeight;
                camera.updateProjectionMatrix();
            }
            renderer.render(scene, camera);
            requestAnimationFrame(render);
        }

    }
}
