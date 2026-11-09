import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Character from '../src/clicker/Character';
import { UPGRADES, advance, createGame, loadGame, serializeGame, settleGame, stats } from '../src/clicker/model';

test('saving before a delayed simulation tick settles time exactly once', () => {
  const start = createGame(1000);
  const saved = settleGame(start, 61000);
  assert.equal(saved.focus, advance(start, 60).focus);
  assert.equal(settleGame(saved, 61000).focus, saved.focus);
  const restored = loadGame(serializeGame(saved, saved.lastSaved), 62000).state;
  assert.ok(Math.abs(restored.focus - advance(start, 61).focus) < 1e-9);
  assert.equal(settleGame(saved, 500).lastSaved, 61000);
});

test('calming upgrades retain a tap drawback beyond the former floor', () => {
  const start = createGame(0);
  const a = stats({ ...start, upgrades: { breathwork: 100 } });
  const b = stats({ ...start, upgrades: { breathwork: 101 } });
  assert.ok(b.perTap > 0 && b.perTap < a.perTap);
  assert.ok(b.perSecond > a.perSecond);
});

test('each upgrade has a distinct visible accessory with ownership levels', () => {
  const render = (upgrades: Record<string, number>, clarity = 16) => renderToStaticMarkup(createElement(Character, { upgrades, clarity, pulse: 0, reducedMotion: true }));
  const empty = render({});
  for (const item of UPGRADES) {
    const owned = render({ [item.id]: 1 });
    assert.ok(owned.includes(`data-accessory="${item.id}"`));
    assert.ok(!empty.includes(`data-accessory="${item.id}"`));
    assert.notEqual(owned, render({ [item.id]: 2 }));
  }
  assert.ok(render({}, 0).includes('tired worker'));
  assert.ok(render({}, 100).includes('serene, smiling human'));
});
