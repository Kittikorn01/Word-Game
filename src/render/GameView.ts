import { RiverView } from './RiverView.ts';
import { ForestReactionView } from './ForestReactionView.ts';
import { traversalPose, isOnLetterGrid } from '../simulation/ForestTraversal.ts';
import type { SupportObjectives } from '../simulation/SupportObjectives.ts';
import { WordShardView } from './WordShardView.ts';
import type { AssistanceState } from '../simulation/AssistanceState.ts';
import { CottageLighting } from './CottageLighting.ts';
import { WorldReactionView } from './WorldReactionView.ts';
import * as THREE from 'three';
import type { FeedbackVisual } from '../feedback/WordFeedback.ts';
import { FloatingLetterView } from './FloatingLetterView.ts';
import { STEP_DURATION } from '../simulation/update.ts';
import { gridToWorld } from '../stages/types.ts';
import { SelectionPathView } from './SelectionPathView.ts';
import type { LetterTile } from '../grid/types.ts';
import { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';
import type { GameState } from '../simulation/types.ts';
import type { StageDefinition } from '../stages/types.ts';
import { createDiorama } from './createDiorama.ts';
import { createPlayer } from './createPlayer.ts';
import { LetterGridView } from './LetterGridView.ts';
import type { LetterGrid } from '../grid/LetterGrid.ts';

export class GameView {
  readonly renderer: THREE.WebGLRenderer;
  private assets = new PrimitiveAssets();
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 100);
  private player = createPlayer(this.assets);
  private resizeObserver: ResizeObserver;
  private cottageLighting?: CottageLighting;
  private outsideMaterial?: THREE.MeshBasicMaterial;
  private world?: WorldReactionView;
  private river?: RiverView;
  private forest?: ForestReactionView;
  private shards: WordShardView;
  private letters: LetterGridView;
  private selectionPath = new SelectionPathView();
  private floatingLetter = new FloatingLetterView();
  constructor(private host: HTMLElement, stage: StageDefinition, private grid: LetterGrid) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor('#dce4d6');
    this.renderer.domElement.setAttribute('aria-label', 'A cozy diorama with a letter floor. Move with WASD or arrow keys.');
    host.append(this.renderer.domElement);
    // No yaw: grid left/right stays screen left/right; fixed elevation ≈ 55 degrees.
    this.camera.position.set(...(stage.camera?.position ?? [0, 16, 11])); this.camera.lookAt(...(stage.camera?.target ?? [0, 0, 0]));
    if (stage.environment === 'cottage') {
      this.cottageLighting = new CottageLighting(); this.scene.add(this.cottageLighting.root);
      // Exterior backdrop stays daylight-colored, independent of every room light.
      this.outsideMaterial = new THREE.MeshBasicMaterial({ color: '#dce4d6', toneMapped: false });
      // A small local material fill preserves the player's silhouette in the dim room.
      for (const surface of ['coat', 'skin', 'hat', 'boots'] as const) {
        const material = this.assets.material[surface];
        material.emissive.copy(material.color); material.emissiveIntensity = .22;
      }
    } else {
    this.scene.add(new THREE.HemisphereLight('#fff7df', '#849580', 2.1));
    const sun = new THREE.DirectionalLight('#fff0d3', 3);
    sun.position.set(-5, 12, 7); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 35 });
    sun.shadow.normalBias = 0.04; this.scene.add(sun);
    }
    const ground = this.assets.mesh('box', 'ground'); ground.scale.set(200, 0.1, 200); ground.position.y = stage.forestBlockout ? stage.forestBlockout.baseY - .06 : -0.87; ground.castShadow = false;
    if (this.outsideMaterial) { ground.material = this.outsideMaterial; ground.receiveShadow = false; }
    this.scene.add(ground, createDiorama(stage, this.assets), this.player);
    if (stage.forestBlockout?.river) { this.river = new RiverView(stage.forestBlockout); this.scene.add(this.river.root); }
    if (stage.forestProgression) { this.forest = new ForestReactionView(this.assets, stage, this.scene); this.scene.add(this.forest.root); }
    if (stage.worldObjects) { this.world = new WorldReactionView(this.assets, stage.worldObjects); this.scene.add(this.world.objects.root); }
    this.shards = new WordShardView(stage); this.scene.add(this.shards.root);
    this.letters = new LetterGridView(grid, this.assets, this.cottageLighting ? .3 : 0, stage.tileTheme); this.scene.add(this.letters.root, this.selectionPath.root, this.floatingLetter.sprite);
    const resize = () => {
      const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
      const aspect = width / height;
      const verticalSpan = stage.camera
        ? Math.max(stage.camera.verticalSpan, stage.camera.minimumWidth / aspect)
        : Math.max(stage.grid.rows * stage.grid.tileSize + 6, (stage.grid.columns * stage.grid.tileSize + 5) / aspect);
      this.camera.left = -verticalSpan * aspect / 2; this.camera.right = verticalSpan * aspect / 2;
      this.camera.top = verticalSpan / 2; this.camera.bottom = -verticalSpan / 2;
      this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height);
    };
    this.resizeObserver = new ResizeObserver(resize); this.resizeObserver.observe(host); resize();
  }
  pickTile = (x: number, y: number): string | null => this.letters.pick(x, y, this.renderer.domElement, this.camera);
  reactionsBusy(state: GameState): boolean { return this.world?.isBusy(state.world) ?? false; }
  render(state: GameState, dt: number, selectedTiles: readonly LetterTile[] = [], feedback?: FeedbackVisual, assistance?: AssistanceState, support?: SupportObjectives): void {

    this.river?.update(dt, state.forest?.riverRecognized ? Math.sin(state.forest.progress.river * Math.PI) : 0);
    if (state.forest) this.forest?.update(state.forest);
    this.cottageLighting?.update(state.world.lightOn, dt);
    this.letters.update(dt, new Set(selectedTiles.map(tile => tile.id)), feedback, assistance?.scanState, selectedTiles.at(-1)?.id);
    this.shards.update(dt, support?.rewardVisual ?? null);
    this.selectionPath.update(selectedTiles, feedback);
    const current = state.player.currentTile, target = state.player.targetTile ?? current;
    const from = gridToWorld(current.column, current.row, this.grid.definition);
    const to = gridToWorld(target.column, target.row, this.grid.definition);
    const t = state.player.targetTile ? Math.min(1, state.player.elapsed / STEP_DURATION) : 0;
    const eased = t * t * (3 - 2 * t);
    const x = THREE.MathUtils.lerp(from.x, to.x, eased), z = THREE.MathUtils.lerp(from.z, to.z, eased);
    this.world?.update(state.world, dt, {x,z});
    const route = state.ending?.pose ?? traversalPose(state);
    this.player.position.set(route?.x ?? x, .105 + (route?.y ?? 0), route?.z ?? z);
    this.floatingLetter.sprite.visible = !state.ending?.pose && isOnLetterGrid(state);
    this.floatingLetter.update(this.grid.getTile(current.row, current.column)!.letter, x, z, dt);
    this.player.rotation.y = state.ending?.pose ? state.ending.heading : state.player.heading;
    this.renderer.render(this.scene, this.camera);
  }
  dispose(): void {
    this.forest?.dispose();
    this.river?.dispose();
    this.shards.dispose();
    this.outsideMaterial?.dispose();
    this.resizeObserver.disconnect();
    this.scene.traverse(object => { if (object instanceof THREE.DirectionalLight) object.shadow.dispose(); });
    this.world?.dispose(); this.floatingLetter.dispose(); this.selectionPath.dispose(); this.letters.dispose(); this.assets.dispose(); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}




