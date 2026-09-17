import type { GameState, MoveAction } from './types.ts';
import type { StageDefinition } from '../stages/types.ts';
import { gridToWorld } from '../stages/types.ts';
import { requestMovement, updateMovement, STEP_DURATION } from './update.ts';

export interface SurfacePoint { x: number; y: number; z: number }
export interface RouteNode extends SurfacePoint {
  id: string;
  gate?: 'bridgeBuilt' | 'climbRouteOpen';
  links: Partial<Record<'east' | 'west' | 'north' | 'south', string>>;
}
export interface ForestTraversalState {
  nodes: Record<string, RouteNode>;
  entry: { row: number; column: number };
  current: string;
  target: string | null;
  elapsed: number;
}
/** An explicit walkable graph: no expanded grid bounds, invisible tiles or physics. */
export function createForestTraversal(stage: StageDefinition): ForestTraversalState {
  const data = stage.forestBlockout!, lane = data.futureBridge;
  const near = data.terrain.find(a => a.id === 'main-ground')!;
  const far = data.terrain.find(a => a.id === 'far-ground')!;
  const raised = data.terrain.find(a => a.id === 'raised-area')!;
  const entry = { row: Math.round((lane.z - (stage.grid.origin?.z ?? 0)) / stage.grid.tileSize + (stage.grid.rows - 1) / 2), column: stage.grid.columns - 1 };
  const start = gridToWorld(entry.column, entry.row, stage.grid);
  const nodes: Record<string, RouteNode> = {};
  const add = (id: string, x: number, y: number, z: number, gate?: RouteNode['gate']) => { nodes[id] = { id, x, y, z, gate, links: {} }; };
  const connect = (a: string, b: string, direction: 'east' | 'north') => {
    nodes[a].links[direction] = b; nodes[b].links[direction === 'east' ? 'west' : 'south'] = a;
  };
  add('grid', start.x, near.top, start.z);
  add('landing', lane.x - lane.width / 2 - .55, near.top, lane.z, 'bridgeBuilt');
  connect('grid', 'landing', 'east');
  let previous = 'landing';
  for (let i = 0; i <= 4; i++) {
    const id = `span-${i}`;
    add(id, lane.x - lane.width / 2 + lane.width * i / 4, near.top + (far.top - near.top) * i / 4, lane.z, 'bridgeBuilt');
    connect(previous, id, 'east'); previous = id;
  }
  add('far-bank', lane.x + lane.width / 2 + .6, far.top, lane.z, 'bridgeBuilt');
  add('root-foot', raised.x - .65, far.top, lane.z, 'bridgeBuilt');
  add('far-clearing', raised.x + .15, far.top, lane.z, 'bridgeBuilt');
  connect(previous, 'far-bank', 'east'); connect('far-bank', 'root-foot', 'east'); connect('root-foot', 'far-clearing', 'east');
  for (const id of ['far-bank', 'root-foot', 'far-clearing']) {
    add(`${id}-south`, nodes[id].x, far.top, lane.z + .8, 'bridgeBuilt');
    connect(`${id}-south`, id, 'north');
  }
  connect('far-bank-south', 'root-foot-south', 'east'); connect('root-foot-south', 'far-clearing-south', 'east');
  previous = 'root-foot';
  // Reach full height before the cliff face; the final tread overlaps the plateau.
  const topZ = raised.z + raised.depth / 2 + .35;
  for (let i = 1; i <= 6; i++) {
    const id = `root-${i}`;
    add(id, nodes['root-foot'].x, far.top + (raised.top - far.top) * i / 6,
      lane.z + (topZ - lane.z) * i / 6, 'climbRouteOpen');
    connect(previous, id, 'north'); previous = id;
  }
  add('summit', nodes['root-foot'].x, raised.top, topZ - 1, 'climbRouteOpen');
  connect(previous, 'summit', 'north');
  return { nodes, entry, current: 'grid', target: null, elapsed: 0 };
}
export function isOnLetterGrid(state: GameState): boolean {
  const t = state.traversal;
  return !t || (t.current === 'grid' && t.target === null);
}
export function requestStageMovement(state: GameState, action: MoveAction, stage: StageDefinition, selecting = false): boolean {
  const t = state.traversal;
  if (!t) return requestMovement(state, action, stage.grid);
  if (t.target || state.player.targetTile || !Number.isInteger(action.x) || !Number.isInteger(action.z) || Math.abs(action.x) + Math.abs(action.z) !== 1) return false;
  if (t.current === 'grid' && !(state.player.currentTile.row === t.entry.row && state.player.currentTile.column === t.entry.column && action.x === 1)) {
    return requestMovement(state, action, stage.grid);
  }
  if (selecting) return false;
  const direction = action.x === 1 ? 'east' : action.x === -1 ? 'west' : action.z === -1 ? 'north' : 'south';
  const id = t.nodes[t.current].links[direction];
  if (!id) return false;
  const gate = t.nodes[id].gate;
  if (gate && !state.forest?.conditions[gate]) return false;
  t.target = id; t.elapsed = 0; state.player.heading = Math.atan2(action.x, action.z);
  return true;
}
export function updateStageMovement(state: GameState, dt: number): boolean {
  const t = state.traversal;
  if (!t?.target) return updateMovement(state, dt);
  if (!Number.isFinite(dt) || dt <= 0) return false;
  t.elapsed = Math.min(STEP_DURATION, t.elapsed + dt);
  if (t.elapsed + 1e-10 < STEP_DURATION) return false;
  t.current = t.target; t.target = null; t.elapsed = 0;
  if (t.current === 'grid') state.player.currentTile = { ...t.entry };
  return true;
}
export function traversalPose(state: GameState): SurfacePoint | null {
  const t = state.traversal;
  if (!t || isOnLetterGrid(state)) return null;
  const from = t.nodes[t.current], to = t.nodes[t.target ?? t.current];
  const p = t.target ? Math.min(1, t.elapsed / STEP_DURATION) : 0, eased = p * p * (3 - 2 * p);
  return { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased, z: from.z + (to.z - from.z) * eased };
}
