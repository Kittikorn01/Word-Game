import { startGame } from './app/GameApp.ts';
import { stage1 } from './stages/stage1.ts';
import './ui/styles.css';
const dispose = startGame(document.querySelector<HTMLElement>('#app')!, stage1);
// Dispose the previous runtime during development hot reload.
if (import.meta.hot) import.meta.hot.dispose(dispose);
