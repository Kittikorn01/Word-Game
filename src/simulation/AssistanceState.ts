import type { LetterGrid } from '../grid/LetterGrid.ts';
import type { GridCoordinate } from '../grid/types.ts';
import type { StageDefinition } from '../stages/types.ts';
import { questStatus, type QuestProgress } from './QuestProgress.ts';
import type { WordProgress } from './WordProgress.ts';

export interface PlayerResources { wordShards: number }
export const createPlayerResources = (): PlayerResources => ({ wordShards: 2 });
export const normalizeScanLetter = (input: string): string | null => input.length === 1 && /^[a-z]$/i.test(input) ? input.toUpperCase() : null;
export interface ScanState { letter: string; tileIds: ReadonlySet<string>; remaining: number }
/** Stage-owned rules; the resource ledger is shared across stage mounts. */
export class AssistanceState {
  readonly hintProgressByQuest = new Map<string, number>();
  readonly collectedPickupIds = new Set<string>();
  scanState: ScanState | null = null;
  private resources: PlayerResources;
  private spawns: NonNullable<StageDefinition['wordShardSpawns']>;
  constructor(resources: PlayerResources, spawns: StageDefinition['wordShardSpawns'] = []) {
    this.resources = resources; this.spawns = spawns;
  }
  get wordShards(): number { return this.resources.wordShards; }
  unavailable(blocked: boolean): string {
    return blocked ? 'Finish your selection or feedback first' : this.wordShards < 1 ? 'No Word Shards' : '';
  }
  hintUnavailable(quests: QuestProgress, words: WordProgress, blocked: boolean): string {
    const reason = this.unavailable(blocked); if (reason) return reason;
    const quest = quests.definitions[quests.focusedIndex];
    if (!quest || !quests.discoveredIds.includes(quest.id) || questStatus(quest, words) !== 'AVAILABLE') return 'Hint unavailable for this quest';
    return (this.hintProgressByQuest.get(quest.id) ?? 0) >= quest.targetWord.length - 1 ? 'No more hints for this word' : '';
  }
  requestHint(quests: QuestProgress, words: WordProgress, blocked: boolean): string {
    const reason = this.hintUnavailable(quests, words, blocked); if (reason) return reason;
    const quest = quests.definitions[quests.focusedIndex];
    this.resources.wordShards--;
    this.hintProgressByQuest.set(quest.id, (this.hintProgressByQuest.get(quest.id) ?? 0) + 1);
    return '';
  }
  hintText(quests: QuestProgress, words: WordProgress): string {
    const quest = quests.definitions[quests.focusedIndex];
    if (!quest || questStatus(quest, words) !== 'AVAILABLE') return '';
    const level = this.hintProgressByQuest.get(quest.id) ?? 0;
    return level ? [...quest.targetWord].map((letter, index) => index < level ? letter : '_').join(' ') : '';
  }
  requestScan(input: string, grid: LetterGrid, blocked: boolean): string {
    const reason = this.unavailable(blocked); if (reason) return reason;
    const letter = normalizeScanLetter(input); if (!letter) return 'Enter exactly one letter A–Z';
    this.resources.wordShards--;
    this.scanState = { letter, tileIds: new Set(grid.findLetter(letter).map(tile => tile.id)), remaining: 3 };
    return '';
  }
  collectAt(coordinate: GridCoordinate): number {
    let count = 0;
    for (const spawn of this.spawns) if (spawn.row === coordinate.row && spawn.column === coordinate.column && !this.collectedPickupIds.has(spawn.id)) {
      this.collectedPickupIds.add(spawn.id); this.resources.wordShards++; count++;
    }
    return count;
  }
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0 || !this.scanState) return;
    this.scanState.remaining -= dt;
    if (this.scanState.remaining <= 1e-9) this.clearScan();
  }
  clearScan(): void { this.scanState = null; }
}
