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
// Reuse direct dev entry: a full reload gives each test a fresh runtime and resources.
let devNavigation: HTMLElement | undefined;
if (import.meta.env.DEV) {
  devNavigation = document.createElement('nav');
  devNavigation.className = 'dev-stage-navigation';
  devNavigation.setAttribute('aria-label', 'Development stage shortcuts');
  const label = document.createElement('span');
  label.textContent = 'DEV / Skip stage';
  devNavigation.append(label);
  for (const stage of stages) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(stage.stageNumber);
    button.setAttribute('aria-label', `Skip to Stage ${stage.stageNumber}: ${stage.title}`);
    button.title = `Stage ${stage.stageNumber}: ${stage.title} (fresh start)`;
    button.addEventListener('click', () => {
      const url = new URL(location.href);
      url.searchParams.set('stage', String(stage.stageNumber));
      location.assign(url.href);
    });
    devNavigation.append(button);
  }
  host.append(devNavigation);
}
// Dispose the previous runtime and dev controls during development hot reload.
if (import.meta.hot) import.meta.hot.dispose(() => { devNavigation?.remove(); manager.dispose(); });
