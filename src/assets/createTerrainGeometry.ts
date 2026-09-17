import { Shape, ExtrudeGeometry } from 'three';

/** Unit chamfered prism, centered like BoxGeometry; shared by all terrain sections. */
export function createTerrainGeometry(squareRight = false): ExtrudeGeometry {
  const shape = new Shape();
  const points = squareRight
    ? [[-.42,-.5],[.5,-.5],[.5,.5],[-.42,.5],[-.5,.42],[-.5,-.42]]
    : [[-.42,-.5],[.42,-.5],[.5,-.42],[.5,.42],[.42,.5],[-.42,.5],[-.5,.42],[-.5,-.42]];
  shape.moveTo(...points[0] as [number, number]);
  points.slice(1).forEach(([x,y]) => shape.lineTo(x,y)); shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geometry.rotateX(-Math.PI / 2); geometry.translate(0, -.5, 0);
  return geometry;
}
