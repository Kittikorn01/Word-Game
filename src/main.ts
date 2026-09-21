import { createPlayerResources } from './simulation/AssistanceState.ts';
import { mountStage } from './app/GameApp.ts';
import { StageManager } from './app/StageManager.ts';
import { stages } from './stages/registry.ts';
import { createStageTransition } from './ui/StageTransition.ts';
import './ui/styles.css';
const host = document.querySelector<HTMLElement>('#app')!;
const resources = createPlayerResources();
// Development-only direct entry for layout/input review; normal progression is unchanged.
const previewNumber = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('stage')) : 0;
const initialStage = stages.find(stage => stage.stageNumber === previewNumber) ?? stages[0];
const manager = new StageManager(stages, initialStage.id,
  stage => mountStage(host, stage, () => { void manager.next().catch(error => console.error('Stage transition failed', error)); }, undefined, undefined, undefined, resources), createStageTransition(host));
manager.start();
// Dispose the previous runtime during development hot reload.
if (import.meta.hot) import.meta.hot.dispose(() => manager.dispose());
