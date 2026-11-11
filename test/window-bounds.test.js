const test = require('node:test');
const assert = require('node:assert');
const { clampWindowPosition } = require('../src/window-bounds');

const size = { sideW: 300, mainW: 700, height: 600 };
const ext = { x: 1512, y: 0, width: 1920, height: 1175 };

test('a window above the top edge comes back down', () => {
  assert.deepStrictEqual(clampWindowPosition({ x: 2000, y: -70 }, ext, size), { x: 2000, y: 0 });
});

test('the main column stays inside the right edge', () => {
  // saved main x 3332 -> window x 3032; main column must end by 3432
  assert.deepStrictEqual(clampWindowPosition({ x: 3032, y: 100 }, ext, size), { x: 3432 - 700 - 300, y: 100 });
});

test('the main column stays inside the left edge', () => {
  assert.deepStrictEqual(clampWindowPosition({ x: 0, y: 100 }, ext, size), { x: 1512 - 300, y: 100 });
});

test('a window already on screen is unchanged', () => {
  assert.deepStrictEqual(clampWindowPosition({ x: 1800, y: 200 }, ext, size), { x: 1800, y: 200 });
});
