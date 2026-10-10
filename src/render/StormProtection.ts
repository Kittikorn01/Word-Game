import { stormSmooth } from '../simulation/StormWorldState.ts';

// World-space measurements of the existing lean-to. Shared by the roof, wooden barrier and rainfall.
export const STORM_ROOF = { left: -3.35, width: 5.7, z: -4.55, y: 2.29, depth: 1.85, slope: .22 } as const;
export const STORM_WINDBREAK = { x: -2.95, z: -5.15, top: 2.3, height: 1.15, depth: 1.57, angle: 0 } as const;
export function stormProtection(shelter: number, safe: number) {
  const cover = .12 + .88 * stormSmooth((shelter - .08) / .72);
  const drop = stormSmooth((safe - .28) / .14);
  const fasten = stormSmooth((safe - .44) / .06);
  return { cover, roofEdge: STORM_ROOF.left + STORM_ROOF.width * cover,
    drop, fasten, protection: drop * (.65 + .35 * fasten) };
}
export function stormRoofHeight(z: number): number {
  return STORM_ROOF.y - Math.tan(STORM_ROOF.slope) * (z - STORM_ROOF.z) + .04 / Math.cos(STORM_ROOF.slope);
}
export function stormWindbreakX(z: number): number {
  return STORM_WINDBREAK.x + Math.tan(STORM_WINDBREAK.angle) * (z - STORM_WINDBREAK.z);
}
