import { startGame } from './app/GameApp.ts';
import { prototypeStage } from './stages/prototype.ts';
import './ui/styles.css';
const dispose = startGame(document.querySelector<HTMLElement>('#app')!, prototypeStage);
// Dispose the previous runtime during development hot reload.
if (import.meta.hot) import.meta.hot.dispose(dispose);
