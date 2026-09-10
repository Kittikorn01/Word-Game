import { areAdjacent, type LetterGrid } from '../grid/LetterGrid.ts';
import type { LetterTile } from '../grid/types.ts';

export interface WordSubmission {
  readonly word: string;
  readonly selectedTileIds: readonly string[];
  readonly path: readonly { readonly id: string; readonly letter: string; readonly row: number; readonly column: number }[];
}

/** Pure gameplay state. No renderer, input, vocabulary or DOM dependencies. */
export class WordSelection {
  private path: LetterTile[] = [];
  private active = false;
  private grid: LetterGrid;
  private onWordSubmitted: (submission: WordSubmission) => void;
  constructor(grid: LetterGrid, onWordSubmitted: (submission: WordSubmission) => void = () => {}) {
    this.grid = grid; this.onWordSubmitted = onWordSubmitted;
  }
  get isSelecting(): boolean { return this.active; }
  get selectedTiles(): readonly LetterTile[] { return this.path.slice(); }
  get selectedTileIds(): readonly string[] { return this.path.map(tile => tile.id); }
  get currentWord(): string { return this.path.map(tile => tile.letter).join(''); }
  start(playerTileId: string | null): boolean {
    const tile = this.grid.getById(playerTileId);
    if (this.active || !tile) return false;
    this.path = [tile]; this.active = true; return true;
  }
  enterTile(id: string | null): void {
    if (!this.active) return;
    const tile = this.grid.getById(id), last = this.path.at(-1)!;
    if (!tile || tile === last || !areAdjacent(last, tile)) return;
    if (tile === this.path.at(-2)) { this.path.pop(); return; }
    if (!this.path.includes(tile)) this.path.push(tile);
  }
  submit(): WordSubmission | null {
    if (!this.active) return null;
    const result: WordSubmission = Object.freeze({
      word: this.currentWord,
      selectedTileIds: Object.freeze([...this.selectedTileIds]),
      path: Object.freeze(this.path.map(({ id, letter, row, column }) => Object.freeze({ id, letter, row, column })))
    });
    this.cancel(); this.onWordSubmitted(result); return result;
  }
  cancel(): void { this.active = false; this.path = []; }
}
