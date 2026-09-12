import { mountStage } from './app/GameApp.ts';
import { StageManager } from './app/StageManager.ts';
import { stages } from './stages/registry.ts';
import { createStageTransition } from './ui/StageTransition.ts';
import './ui/styles.css';
const host = document.querySelector<HTMLElement>('#app')!;
const manager = new StageManager(stages, stages[0].id,
  stage => mountStage(host, stage, () => { void manager.next().catch(error => console.error('Stage transition failed', error)); }), createStageTransition(host));
manager.start();
// Dispose the previous runtime during development hot reload.
if (import.meta.hot) import.meta.hot.dispose(() => manager.dispose());
