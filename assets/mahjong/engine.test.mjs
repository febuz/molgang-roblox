// node engine.test.mjs — vectors for the Cantonese engine port.
import {
  buildWall, chowOptions, canPung, canKongFromDiscard, isWinningHand,
  isWinningTile, calculateFaan, faanToCoins, newGame, stepUntilHuman,
  availableClaims, discard, drawTile, FLOWERS, TILE_TYPES,
} from './engine.js';

let failures = 0;
const test = (name, fn) => {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { failures++; console.error(`FAIL ${name}: ${e.message}`); }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion failed'); };

test('wall is a full Cantonese set: 136 + 8 flowers = 144', () => {
  const wall = buildWall();
  assert(wall.length === 144, `got ${wall.length}`);
  const flowers = wall.filter((t) => FLOWERS.includes(t));
  assert(flowers.length === 8, `flowers ${flowers.length}`);
});

test('chow options at the edges', () => {
  assert(chowOptions(['2c', '3c'], '1c').length === 1);
  assert(chowOptions(['7c', '8c'], '9c').length === 1);
  assert(chowOptions(['1c', '2c', '4c', '5c'], '3c').length === 3);
  assert(chowOptions(['1c', '2c'], 'E').length === 0, 'honors never chow');
});

test('pung/kong from discard', () => {
  assert(canPung(['5d', '5d', '1b'], '5d'));
  assert(!canPung(['5d', '1b'], '5d'));
  assert(canKongFromDiscard(['5d', '5d', '5d'], '5d'));
});

test('winning hand: 4 melds + pair (mixed chows and pongs)', () => {
  const hand = ['1c', '2c', '3c', '4c', '5c', '6c', '7d', '7d', '7d', '2b', '3b', '4b', 'E', 'E'];
  assert(isWinningHand(hand));
});

test('non-winning hand refused', () => {
  const hand = ['1c', '2c', '3c', '4c', '5c', '6c', '7d', '7d', '9d', '2b', '3b', '4b', 'E', 'E'];
  assert(!isWinningHand(hand));
});

test('winning with exposed melds (shorter concealed hand)', () => {
  // two exposed melds -> concealed 8 tiles: 2 sets + pair
  const hand = ['1c', '2c', '3c', '7d', '7d', '7d', 'Rd', 'Rd'];
  assert(isWinningHand(hand, 2));
  assert(isWinningTile(['1c', '2c', '3c', '7d', '7d', '7d', 'Rd'], 'Rd', 2));
});

test('faan: dragons, winds, half flush, all pongs, flowers', () => {
  const hand = ['Rd', 'Rd', 'Rd', 'E', 'E', 'E', '1c', '1c'];
  const melds = [{ type: 'pong', tiles: ['5c', '5c', '5c'] }, { type: 'pong', tiles: ['9c', '9c', '9c'] }];
  const { faan, details } = calculateFaan(hand, melds, 'E', 'E', [], 0);
  // all pongs +3, dragon +1, seat wind +1, round wind +1, half flush +3 (c + honors), no flowers +1
  assert(faan === 10, `faan ${faan}: ${details.join(', ')}`);
});

test('faan: own flower matches seat', () => {
  const hand = ['1c', '2c', '3c', '7d', '7d', '7d', 'Rd', 'Rd'];
  const r1 = calculateFaan(hand, [{ type: 'chi', tiles: ['4c', '5c', '6c'] },
    { type: 'chi', tiles: ['1b', '2b', '3b'] }], 'S', 'E', ['f2', 's2'], 1);
  assert(r1.faan === 2 && r1.details.filter((d) => d.includes('Own Flower')).length === 2,
    `seat-2 flowers should be exactly the 2 own-flower faan: ${r1.faan} (${r1.details})`);
  const r0 = calculateFaan(hand, [], 'E', 'E', ['f3'], 0);
  assert(!r0.details.some((d) => d.includes('Own Flower')), 'f3 is not seat 1 flower');
});

test('faan floor is 1 and coin curve', () => {
  const { faan } = calculateFaan(['1c', '2c', '3c'], [{ type: 'chi', tiles: ['4d', '5d', '6d'] }], 'S', 'E', ['f1'], 3);
  assert(faan === 1);
  assert(faanToCoins(1) === 20 && faanToCoins(4) === 160 && faanToCoins(99) === 1280);
});

test('full game loop reaches an end without stalling', () => {
  let seed = 42;
  const rng = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
  const g = newGame(rng);
  let guard = 0;
  while (g.phase !== 'over' && !g.drawn && guard++ < 400) {
    stepUntilHuman(g);
    if (g.phase === 'over' || g.drawn) break;
    if (g.phase === 'self-win-offer') { g.phase = 'discard'; }
    if (g.phase === 'claims') {
      // human declines every claim
      g.phase = 'draw';
      g.turn = (g.lastDiscarder + 1) % 4;
      g.lastDiscard = null;
      continue;
    }
    if (g.phase === 'draw' && g.turn === 0) {
      const t = drawTile(g, g.players[0]);
      if (t == null) break;
      g.phase = 'discard';
    }
    if (g.phase === 'discard' && g.turn === 0) {
      discard(g, 0, g.players[0].hand[0]);
    }
  }
  assert(g.phase === 'over' || g.drawn, `stuck in ${g.phase} after ${guard}`);
  // every hand + melds*3 stays consistent at 13 for non-winners
  for (let i = 0; i < 4; i++) {
    if (g.winner === i) continue;
    const p = g.players[i];
    const n = p.hand.length + p.melds.reduce((a, m) => a + (m.type === 'kong' ? 3 : 3), 0);
    assert(n === 13 || n === 14, `player ${i} tile count ${n}`);
  }
});

test('claims priority surface for the human', () => {
  const g = newGame(() => 0.5);
  g.players[0].hand = ['5d', '5d', '1c', '2c', '3c', '4c', '5c', '6c', '7c', '8c', '9c', '1b', '2b'];
  g.players[1].hand[0] = '5d';
  g.turn = 1;
  discard(g, 1, '5d');
  assert(availableClaims(g, 0).includes('pung'));
});

process.exit(failures ? 1 : 0);
