import { Group } from 'three';
import type { PrimitiveAssets } from '../assets/PrimitiveAssets.ts';
export function createPlayer(assets: PrimitiveAssets): Group {
  const player = new Group();
  const body = assets.mesh('body', 'coat'); body.position.y = 0.4;
  const head = assets.mesh('head', 'skin'); head.position.y = 0.82;
  const hat = assets.mesh('body', 'hat'); hat.scale.set(1.4, 0.28, 1.4); hat.position.y = 1.02;
  const nose = assets.mesh('box', 'skin'); nose.scale.set(0.09, 0.1, 0.12); nose.position.set(0, 0.82, 0.23);
  player.add(body, head, hat, nose);
  for (const x of [-0.13, 0.13]) {
    const boot = assets.mesh('box', 'boots'); boot.scale.set(0.18, 0.14, 0.27); boot.position.set(x, 0.07, 0.025); player.add(boot);
  }
  return player;
}
