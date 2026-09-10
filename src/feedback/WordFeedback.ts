import { CORRECT_DURATION, type LetterGrid } from '../grid/LetterGrid.ts';
import type { LetterTile } from '../grid/types.ts';
import type { WordResult } from '../validation/WordValidator.ts';

export interface FeedbackVisual {
  readonly tone: 'correct' | 'wrong' | 'already';
  readonly progress: number;
}
export class WordFeedback {
  private result: WordResult | null = null;
  private remaining = 0;
  private duration = 0;
  private tiles: readonly LetterTile[] = [];
  private grid: LetterGrid;
  constructor(grid: LetterGrid) { this.grid = grid; }
  get isResolving(): boolean { return this.result !== null; }
  get selectedTiles(): readonly LetterTile[] { return this.tiles; }
  get message(): string {
    if (!this.result) return '';
    const { status, word } = this.result;
    return status === 'CORRECT' ? `${word} FOUND` : status === 'ALREADY_COMPLETED'
      ? `${word} · Already found.` : `${word} · That word isn't needed here.`;
  }
  get visual(): FeedbackVisual | undefined {
    if (!this.result) return;
    return { tone: this.result.status === 'CORRECT' ? 'correct' : this.result.status === 'WRONG' ? 'wrong' : 'already',
      progress: 1 - this.remaining / this.duration };
  }
  begin(result: WordResult): boolean {
    if (this.isResolving) return false;
    this.result = result;
    this.duration = result.status === 'CORRECT' ? CORRECT_DURATION : result.status === 'WRONG' ? 1.1 : 0.75;
    this.remaining = this.duration;
    this.tiles = result.selectedTileIds.flatMap(id => this.grid.getById(id) ?? []);
    if (result.status === 'CORRECT') {
      for (const tile of this.tiles) tile.state = 'SELECTED';
      this.grid.playCorrectOnSelected();
    }
    return true;
  }
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0 || !this.isResolving) return;
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining < 1e-8) this.clear();
  }
  clear(): void {
    for (const tile of this.tiles) { tile.state = 'NORMAL'; tile.correctRemaining = 0; }
    this.result = null; this.tiles = []; this.remaining = 0;
  }
}
