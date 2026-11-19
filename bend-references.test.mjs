import assert from 'node:assert/strict';
import { geometry, extend } from './geometry.mjs';
import { bendReferenceLayout, bestDrawingAngle } from './labels.mjs';

const close = (actual, expected, message) => assert.ok(
  Math.abs(actual - expected) < 1e-8,
  `${message}: ${actual} != ${expected}`,
);

function checkReferences(state, work, expectExpanded = false) {
  const g = geometry(state), originalGeometry = structuredClone(g);
  const height = work ? 1200 : 540;
  const plotWidth = work ? 640 : 600, plotHeight = work ? 1000 : 320;
  const angle = bestDrawingAngle(g.points, plotWidth, plotHeight);
  const c = Math.cos(angle), s = Math.sin(angle);
  const rotate = ([x, y]) => [x * c - y * s, x * s + y * c];
  const rotated = g.points.map(rotate);
  const xs = rotated.map(p => p[0]), ys = rotated.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min(plotWidth / Math.max(1, maxX - minX), plotHeight / Math.max(1, maxY - minY));
  const base = point => {
    const p = rotate(point);
    return [450 + (p[0] - (minX + maxX) / 2) * scale,
      (work ? 600 : 255) - (p[1] - (minY + maxY) / 2) * scale];
  };
  const originalProjection = g.points.map(base);
  const layout = bendReferenceLayout(g.arcs, base, { width: 900, height });

  assert.equal(layout.labels.length, g.arcs.length);
  assert.equal(new Set(layout.labels.map(label => label.index)).size, g.arcs.length);
  if (expectExpanded) assert.ok(layout.height > height, 'Crowded references must expand the page');
  else assert.equal(layout.height, height);

  for (const label of layout.labels) {
    assert.equal(label.id, `B${label.index + 1}`, 'B numbers must retain their bend association');
    const midpoint = g.arcs[label.index].samples[16];
    const expected = layout.project(midpoint), before = base(midpoint);
    close(label.x, expected[0], `${label.id} anchor x must meet the pipe`);
    close(label.y, expected[1], `${label.id} anchor y must meet the pipe`);
    close(expected[0], before[0], 'Page expansion must preserve x');
    close(expected[1], before[1] + (layout.height - height) / 2,
      'Page expansion must shift pipe and anchors exactly once');
  }
  assert.deepEqual(g, originalGeometry, 'Reference layout must not mutate pipe geometry');
  assert.deepEqual(g.points.map(base), originalProjection, 'Reference layout must not alter the base projection');
  return layout;
}

// Regression: portrait anchors previously received an extra (1200 - 540) / 2 = 330 offset.
const fixture = { radius: 80, heading: 0,
  lengths: [350, 1142, 169, 270, 169, 950], turns: [45, 45, -45, -45, 45] };
for (const work of [false, true]) checkReferences(fixture, work);

const crowded = { radius: 80, heading: 0,
  lengths: Array.from({ length: 201 }, (_, i) => 80 + i % 5 * 10),
  turns: Array.from({ length: 200 }, (_, i) => i % 2 ? -45 : 45) };
for (const work of [false, true]) checkReferences(crowded, work, true);

for (const turn of [-135, -45, 45, 90]) {
  const extended = extend(fixture, 'A', 220, turn);
  for (const work of [false, true]) checkReferences(extended, work);
}

console.log('Bend reference anchors match editor/workshop pipe projections, crowded pages and extension at A: PASS');
