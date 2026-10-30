import { Easing, Group, Tween } from '@tweenjs/tween.js';
import { PerspectiveCamera, Scene, type Object3D } from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { createLayoutTargets, type LayoutName, type LayoutTargets } from '@/lib/layouts/layouts';
import type { Person } from '@/lib/people/types';
import { createPersonTile } from './person-tile';

/**
 * The three.js css3d_periodictable demo as a class: tiles are DOM elements placed in 3D by
 * CSS3DRenderer, TrackballControls handles rotate/zoom/pan, and tween.js animates layout changes.
 *
 * Browser-only. Import it with a dynamic import() from client code.
 */
export class PeopleScene {
  private readonly camera: PerspectiveCamera;
  private readonly scene = new Scene();
  private readonly renderer = new CSS3DRenderer();
  private readonly controls: TrackballControls;
  private readonly tweens = new Group();
  private readonly tiles: CSS3DObject[] = [];
  private readonly targets: LayoutTargets;
  private readonly resizeObserver: ResizeObserver;
  private frameId: number | null = null;

  constructor(
    private readonly container: HTMLElement,
    people: readonly Person[],
  ) {
    const { width, height } = this.measure();

    this.camera = new PerspectiveCamera(40, width / height, 1, 10000);
    this.camera.position.z = 3000;

    for (const person of people) {
      const tile = new CSS3DObject(createPersonTile(person));
      // Start scattered, as in the demo, so the first layout animates in.
      tile.position.set(randomSpread(4000), randomSpread(4000), randomSpread(4000));
      this.scene.add(tile);
      this.tiles.push(tile);
    }

    this.targets = createLayoutTargets(people.length);

    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.minDistance = 500;
    this.controls.maxDistance = 6000;

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.frameId = requestAnimationFrame(this.animate);
  }

  /** Animates every tile to its place in the given layout. Durations vary per tile, as in the demo. */
  transformTo(layout: LayoutName, duration = 2000): void {
    this.tweens.removeAll();
    const targets = this.targets[layout];

    this.tiles.forEach((tile, index) => {
      const target: Object3D = targets[index];

      new Tween(tile.position, this.tweens)
        .to(
          { x: target.position.x, y: target.position.y, z: target.position.z },
          Math.random() * duration + duration,
        )
        .easing(Easing.Exponential.InOut)
        .start();

      new Tween(tile.rotation, this.tweens)
        .to(
          { x: target.rotation.x, y: target.rotation.y, z: target.rotation.z },
          Math.random() * duration + duration,
        )
        .easing(Easing.Exponential.InOut)
        .start();
    });
  }

  dispose(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.resizeObserver.disconnect();
    this.tweens.removeAll();
    this.controls.dispose();
    // Removing a CSS3DObject from the scene also removes its element from the DOM.
    this.scene.clear();
    this.renderer.domElement.remove();
  }

  private readonly animate = (time: number): void => {
    this.frameId = requestAnimationFrame(this.animate);
    this.tweens.update(time);
    this.controls.update();
    // CSS3DRenderer only rewrites a tile's transform when it changed, so rendering every frame is cheap.
    this.renderer.render(this.scene, this.camera);
  };

  private handleResize(): void {
    const { width, height } = this.measure();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.controls.handleResize();
  }

  private measure(): { width: number; height: number } {
    return {
      width: Math.max(this.container.clientWidth, 1),
      height: Math.max(this.container.clientHeight, 1),
    };
  }
}

function randomSpread(range: number): number {
  return Math.random() * range - range / 2;
}
