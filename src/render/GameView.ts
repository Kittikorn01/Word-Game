import * as THREE from 'three';
import { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';
import type { GameState } from '../simulation/types.ts';
import type { StageDefinition } from '../stages/types.ts';
import { createDiorama } from './createDiorama.ts';
import { createPlayer } from './createPlayer.ts';

export class GameView {
  readonly renderer: THREE.WebGLRenderer;
  private assets = new PrimitiveAssets();
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 100);
  private player = createPlayer(this.assets);
  private resizeObserver: ResizeObserver;
  constructor(private host: HTMLElement, stage: StageDefinition) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor('#dce4d6');
    this.renderer.domElement.setAttribute('aria-label', 'A small woodland diorama. Move with WASD or arrow keys.');
    host.append(this.renderer.domElement);
    // No yaw: grid left/right stays screen left/right; fixed elevation ≈ 55 degrees.
    this.camera.position.set(0, 16, 11); this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.HemisphereLight('#fff7df', '#849580', 2.1));
    const sun = new THREE.DirectionalLight('#fff0d3', 3);
    sun.position.set(-5, 12, 7); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 35 });
    sun.shadow.normalBias = 0.04; this.scene.add(sun);
    const ground = this.assets.mesh('box', 'ground'); ground.scale.set(200, 0.1, 200); ground.position.y = -0.87; ground.castShadow = false;
    this.scene.add(ground, createDiorama(stage, this.assets), this.player);
    const resize = () => {
      const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
      const aspect = width / height;
      const verticalSpan = Math.max(stage.grid.rows * stage.grid.tileSize + 6, (stage.grid.columns * stage.grid.tileSize + 5) / aspect);
      this.camera.left = -verticalSpan * aspect / 2; this.camera.right = verticalSpan * aspect / 2;
      this.camera.top = verticalSpan / 2; this.camera.bottom = -verticalSpan / 2;
      this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height);
    };
    this.resizeObserver = new ResizeObserver(resize); this.resizeObserver.observe(host); resize();
  }
  render(state: GameState): void {
    this.player.position.set(state.player.x, 0.105, state.player.z);
    this.player.rotation.y = state.player.heading;
    this.renderer.render(this.scene, this.camera);
  }
  dispose(): void {
    this.resizeObserver.disconnect();
    this.scene.traverse(object => { if (object instanceof THREE.DirectionalLight) object.shadow.dispose(); });
    this.assets.dispose(); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
