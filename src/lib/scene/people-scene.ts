import { Easing, Group, Tween } from '@tweenjs/tween.js';
import { PerspectiveCamera, Quaternion, Scene, Vector3, type Object3D } from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { createLayoutTargets, type LayoutName, type LayoutTargets } from '@/lib/layouts/layouts';
import type { Person } from '@/lib/people/types';
import { createPersonTile } from './person-tile';

/** How long a clicked tile takes to fly out to the camera, or back to its place, in ms. */
const FOCUS_DURATION = 800;
/** Share of the viewport a focused tile fills, on whichever side runs out first. */
const FOCUS_FILL = { width: 0.8, height: 0.6 } as const;
/** Pointer travel, in px, under which a press counts as a click rather than a camera drag. */
const CLICK_TOLERANCE = 5;

interface Pose {
  position: Vector3;
  quaternion: Quaternion;
}

interface FocusedTile {
  index: number;
  /** Where the tile was when it was clicked. */
  from: Pose;
  /** The tile's CSS size, read once so the frame loop never forces a layout. */
  width: number;
  height: number;
  /** 0 → 1 as the tile flies out, driven by a tween. */
  progress: { value: number };
}

/**
 * The three.js css3d_periodictable demo as a class: tiles are DOM elements placed in 3D by
 * CSS3DRenderer, TrackballControls handles rotate/zoom/pan, and tween.js animates layout changes.
 * Clicking a tile pulls it out of the layout and brings it up close; the next click anywhere, or
 * Escape, sends it back.
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
  /** The tweens moving each tile, by tile index, so a new animation can stop the old one. */
  private readonly tileTweens: Tween[][] = [];
  private readonly targets: LayoutTargets;
  private readonly resizeObserver: ResizeObserver;
  private layout: LayoutName = 'table';
  private focused: FocusedTile | null = null;
  /** Where the current press started, and on which tile (-1 for the background). */
  private press: { x: number; y: number; index: number } | null = null;
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

    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('click', this.handleClick);
    window.addEventListener('keydown', this.handleKeyDown);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.frameId = requestAnimationFrame(this.animate);
  }

  /** Animates every tile to its place in the given layout. Durations vary per tile, as in the demo. */
  transformTo(layout: LayoutName, duration = 2000): void {
    this.layout = layout;
    // The focused tile goes home with the rest instead of flying back on its own.
    this.clearFocus();
    this.tweens.removeAll();
    const targets = this.targets[layout];

    this.tiles.forEach((tile, index) => {
      const target: Object3D = targets[index];

      this.tileTweens[index] = [
        new Tween(tile.position, this.tweens)
          .to(
            { x: target.position.x, y: target.position.y, z: target.position.z },
            Math.random() * duration + duration,
          )
          .easing(Easing.Exponential.InOut)
          .start(),

        new Tween(tile.rotation, this.tweens)
          .to(
            { x: target.rotation.x, y: target.rotation.y, z: target.rotation.z },
            Math.random() * duration + duration,
          )
          .easing(Easing.Exponential.InOut)
          .start(),
      ];
    });
  }

  /** Pulls a tile out of the layout and flies it up to the camera, facing it, filling much of the view. */
  private focus(index: number): void {
    const tile = this.tiles[index];
    const progress = { value: 0 };

    this.replaceTileTweens(index, [
      new Tween(progress, this.tweens).to({ value: 1 }, getFocusDuration()).easing(Easing.Cubic.Out).start(),
    ]);
    this.focused = {
      index,
      from: { position: tile.position.clone(), quaternion: tile.quaternion.clone() },
      width: tile.element.offsetWidth,
      height: tile.element.offsetHeight,
      progress,
    };

    // The camera holds still while a tile is up close, so dragging cannot swing the scene behind it.
    this.controls.enabled = false;
    tile.element.classList.add('person-tile--focused');
    this.renderer.domElement.toggleAttribute('data-tile-focused', true);
  }

  /** Flies the focused tile back to its place in the current layout. */
  private release(): void {
    const index = this.clearFocus();
    if (index === null) return;

    const tile = this.tiles[index];
    const from: Pose = { position: tile.position.clone(), quaternion: tile.quaternion.clone() };
    const to = this.targets[this.layout][index];

    this.replaceTileTweens(index, [
      new Tween({ value: 0 }, this.tweens)
        .to({ value: 1 }, getFocusDuration())
        .easing(Easing.Cubic.InOut)
        .onUpdate(({ value }) => {
          tile.position.lerpVectors(from.position, to.position, value);
          tile.quaternion.slerpQuaternions(from.quaternion, to.quaternion, value);
        })
        .start(),
    ]);
  }

  dispose(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.resizeObserver.disconnect();
    this.tweens.removeAll();
    this.controls.dispose();
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('click', this.handleClick);
    window.removeEventListener('keydown', this.handleKeyDown);
    // Removing a CSS3DObject from the scene also removes its element from the DOM.
    this.scene.clear();
    this.renderer.domElement.remove();
  }

  private readonly animate = (time: number): void => {
    this.frameId = requestAnimationFrame(this.animate);
    this.tweens.update(time);
    this.controls.update();
    // Placed every frame, after the camera moves, so the tile stays put through damping and resizes.
    if (this.focused) this.placeFocusedTile(this.focused);
    // CSS3DRenderer only rewrites a tile's transform when it changed, so rendering every frame is cheap.
    this.renderer.render(this.scene, this.camera);
  };

  private placeFocusedTile({ index, from, width, height, progress }: FocusedTile): void {
    const tile = this.tiles[index];
    const viewport = this.renderer.getSize();
    // At this distance in front of the camera, CSS3DRenderer draws one world unit as one CSS pixel.
    const pixelDistance = (viewport.height / 2) * this.camera.projectionMatrix.elements[5];
    const scale = Math.min(
      (viewport.width * FOCUS_FILL.width) / width,
      (viewport.height * FOCUS_FILL.height) / height,
    );

    focusPosition
      .set(0, 0, -pixelDistance / scale)
      .applyQuaternion(this.camera.quaternion)
      .add(this.camera.position);
    tile.position.lerpVectors(from.position, focusPosition, progress.value);
    tile.quaternion.slerpQuaternions(from.quaternion, this.camera.quaternion, progress.value);
  }

  /** Drops the focus state without moving the tile. Returns the index of the tile that had it. */
  private clearFocus(): number | null {
    if (!this.focused) return null;
    const { index } = this.focused;
    this.focused = null;
    this.controls.enabled = true;
    this.tiles[index].element.classList.remove('person-tile--focused');
    this.renderer.domElement.toggleAttribute('data-tile-focused', false);
    return index;
  }

  /** Stops whatever was moving the tile, so two tweens never fight over it. */
  private replaceTileTweens(index: number, tweens: Tween[]): void {
    this.tweens.remove(...(this.tileTweens[index] ?? []));
    this.tileTweens[index] = tweens;
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!event.isPrimary || event.button !== 0) {
      this.press = null;
      return;
    }
    // Read the tile now: TrackballControls captures the pointer, so the click lands on the container.
    const target = event.target instanceof Node ? event.target : null;
    const index = this.tiles.findIndex((tile) => tile.element.contains(target));
    this.press = { x: event.clientX, y: event.clientY, index };
  };

  // A click rather than pointerup, so TrackballControls has finished with the press before it is disabled.
  private readonly handleClick = (event: MouseEvent): void => {
    const press = this.press;
    this.press = null;
    if (!press) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > CLICK_TOLERANCE) return;

    // Like a modal: while a tile is up close, any click puts it back, even one on a faded tile.
    if (this.focused) this.release();
    else if (press.index !== -1) this.focus(press.index);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.release();
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

const focusPosition = new Vector3();

function getFocusDuration(): number {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : FOCUS_DURATION;
}

function randomSpread(range: number): number {
  return Math.random() * range - range / 2;
}
