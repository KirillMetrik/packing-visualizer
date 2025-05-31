import { CommonModule } from '@angular/common';
import {
	AfterViewInit,
	Component,
	ElementRef,
	OnInit,
	ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

@Component({
	selector: 'packing-visualizer',
	templateUrl: './packing-visualizer.component.html',
	styleUrls: ['./packing-visualizer.component.scss'],
	imports: [FormsModule, CommonModule]
})
export class PackingVisualizerComponent implements OnInit, AfterViewInit {
	@ViewChild('rendererContainer') rendererContainer!: ElementRef;

	item = { length: 13, width: 9, height: 5 };
	box = { length: 60, width: 40, height: 30, thickness: 0.5 };
	quantity = 20;

	notFitItems = 0;

	private scene!: THREE.Scene;
	private camera!: THREE.PerspectiveCamera;
	private renderer!: THREE.WebGLRenderer;
	private controls!: OrbitControls;

	ngOnInit(): void { }

	rotateItem() {
		const { length, width, height } = this.item;
		this.item.length = height;
		this.item.width = length;
		this.item.height = width;
	}

	ngAfterViewInit(): void {
		this.initThree();
		this.renderPacking();
	}

	initThree() {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color('#fdfdfd');

		const width = this.rendererContainer.nativeElement.clientWidth;
		const height = this.rendererContainer.nativeElement.clientHeight;

		this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
		this.camera.position.set(50, 50, 50);

		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setSize(width, height);
		this.renderer.shadowMap.enabled = true; // Enable shadow mapping
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows
		this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.update();
		this.animate(); // Add this line to start the animation loop
	}

	animate() {
		requestAnimationFrame(() => this.animate());
		this.controls.update(); // Ensure controls are updated
		this.renderer.render(this.scene, this.camera); // Render the scene continuously
	}

	renderPacking() {
		// Clear previous scene
		while (this.scene.children.length > 0) {
			this.scene.remove(this.scene.children[0]);
		}

		// Calculate inner dimensions of the box
		const { length: outerL, width: outerW, height: outerH, thickness } = this.box;
		const boxL = outerL - 2 * thickness;
		const boxW = outerW - 2 * thickness;
		const boxH = outerH - 2 * thickness;

		// Render the outer box as a wireframe
		const boxGeometry = new THREE.BoxGeometry(outerL, outerH, outerW);
		const boxEdges = new THREE.EdgesGeometry(boxGeometry);
		const boxLine = new THREE.LineSegments(
			boxEdges,
			new THREE.LineBasicMaterial({ color: 0x333333 })
		);
		boxLine.position.set(0, 0, 0); // Center the box at the origin
		this.scene.add(boxLine);

		// Adjust camera and controls to focus on the center of the box
		this.camera.position.set(outerL, outerH, outerW);
		this.controls.target.set(0, 0, 0); // Focus controls on the center
		this.controls.update();

		// Adjust grid origin to align with the box's center
		const gridOriginX = -boxL / 2;
		const gridOriginY = -boxW / 2;
		const gridOriginZ = -boxH / 2;

		const directions = [
			[0, 1, 2], [0, 2, 1],
			[1, 0, 2], [1, 2, 0],
			[2, 0, 1], [2, 1, 0],
		];

		const occupied: boolean[][][] = [];
		const cellSize = 1;
		const gridX = Math.floor(boxL / cellSize);
		const gridY = Math.floor(boxW / cellSize);
		const gridZ = Math.floor(boxH / cellSize);
		for (let x = 0; x < gridX; x++) {
			occupied[x] = [];
			for (let y = 0; y < gridY; y++) {
				occupied[x][y] = Array(gridZ).fill(false);
			}
		}

		const itemsPlaced: { x: number; y: number; z: number; dims: number[] }[] = [];

		for (let n = 0; n < this.quantity; n++) {
			let placed = false;

			for (const [ix, iy, iz] of directions) {
				const dims = [
					this.item.length,
					this.item.width,
					this.item.height,
				];
				const d = [dims[ix], dims[iy], dims[iz]];

				const dx = Math.ceil(d[0] / cellSize);
				const dy = Math.ceil(d[1] / cellSize);
				const dz = Math.ceil(d[2] / cellSize);

				for (let x = 0; x <= gridX - dx; x++) {
					for (let y = 0; y <= gridY - dy; y++) {
						for (let z = 0; z <= gridZ - dz; z++) {
							let fits = true;
							for (let i = 0; i < dx; i++) {
								for (let j = 0; j < dy; j++) {
									for (let k = 0; k < dz; k++) {
										if (occupied[x + i]?.[y + j]?.[z + k]) {
											fits = false;
											break;
										}
									}
									if (!fits) break;
								}
								if (!fits) break;
							}
							if (fits) {
								for (let i = 0; i < dx; i++) {
									for (let j = 0; j < dy; j++) {
										for (let k = 0; k < dz; k++) {
											occupied[x + i][y + j][z + k] = true;
										}
									}
								}
								itemsPlaced.push({ x, y, z, dims: d });
								placed = true;
								break;
							}
						}
						if (placed) break;
					}
					if (placed) break;
				}
				if (placed) break;
			}
		}

		itemsPlaced.forEach((item, idx) => {
			const geometry = new THREE.BoxGeometry(item.dims[0], item.dims[2], item.dims[1]);
			const material = new THREE.MeshBasicMaterial({
				color: new THREE.Color(`hsl(${(idx * 47) % 360}, 70%, 70%)`) // Assign unique color
			});
			const cube = new THREE.Mesh(geometry, material);
			cube.position.set(
				gridOriginX + item.x * cellSize + item.dims[0] / 2,
				gridOriginZ + item.z * cellSize + item.dims[2] / 2,
				gridOriginY + item.y * cellSize + item.dims[1] / 2
			);
			this.scene.add(cube);
		});

		this.renderer.render(this.scene, this.camera);
		this.notFitItems = this.quantity - itemsPlaced.length;
	}
}