import { mountTutorialStage } from './app/TutorialStage.ts';
import { createAdventureIntro } from './ui/AdventureIntro.ts';
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
const transition = createStageTransition(host);
const manager = new StageManager(stages, initialStage.id,
  stage => mountStage(host, stage, () => { void manager.next().catch(error => console.error('Stage transition failed', error)); }, undefined, undefined, undefined, resources), transition);
// Stage 6 is preview-only until progression is authored; review its real intro as well.
let previewDisposed = false;
let intro: ReturnType<typeof createAdventureIntro> | undefined;
if (import.meta.env.DEV && initialStage.stageNumber === 6) {
  void transition.showIntro?.(initialStage).then(() => {
    if (previewDisposed) return;
    manager.start(); return transition.fadeIn();
  }).catch(error => console.error('Stage preview intro failed', error));
} else if (previewNumber > 0) manager.start();
else showWelcome();
let practice: ReturnType<typeof mountTutorialStage> | undefined;
let starting = false;
async function startAdventure() {
  if (starting || previewDisposed) return;
  starting = true;
  await transition.fadeOut();
  if (previewDisposed) return;
  await transition.showIntro?.(initialStage);
  if (previewDisposed) return;
  manager.start();
  await transition.fadeIn();
}
function showWelcome() {
  intro = createAdventureIntro(host, () => { void startAdventure(); }, () => {
    practice = mountTutorialStage(host, () => { void startAdventure(); }, showWelcome);
  });
}
// Dispose the previous runtime during development hot reload.
if (import.meta.hot) import.meta.hot.dispose(() => { previewDisposed = true; intro?.dispose(); practice?.dispose(); manager.dispose(); });
