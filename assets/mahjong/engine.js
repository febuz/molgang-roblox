// Cantonese (Hong Kong style) mahjong engine — pure logic, no DOM.
// Direct port of molgang-web api/routes/mahjong.py (tiles, chow/pung/kong,
// recursive win detection, faan scoring, AI tile valuation), extended with
// the Cantonese flower/season bonus tiles (136 + 8 = 144 tiles): a drawn
// flower is exposed immediately and replaced from the wall; a flower whose
// number matches your seat adds +1 faan, no flowers at all adds +1.

export const SUITS = ['c', 'd', 'b']; // characters, dots, bamboo
export const WINDS = ['E', 'S', 'W', 'N'];
export const DRAGONS = ['Wd', 'Gd', 'Rd'];
export const HONORS = [...WINDS, ...DRAGONS];
export const FLOWERS = ['f1', 'f2', 'f3', 'f4', 's1', 's2', 's3', 's4'];

export const TILE_TYPES = [];
for (const suit of SUITS) for (let n = 1; n <= 9; n++) TILE_TYPES.push(`${n}${suit}`);
TILE_TYPES.push(...HONORS);

export const DISPLAY = {
  E: '東', S: '南', W: '西', N: '北', Wd: '白', Gd: '發', Rd: '中',
  f1: '梅', f2: '蘭', f3: '菊', f4: '竹', s1: '春', s2: '夏', s3: '秋', s4: '冬',
};
const SUIT_GLYPH = { c: '萬', d: '筒', b: '索' };
export function tileLabel(t) {
  if (DISPLAY[t]) return DISPLAY[t];
  return `${t[0]}${SUIT_GLYPH[t[1]] || ''}`;
}

// Honors/flowers first: 'Rd'/'Wd'/'Gd' end in 'd' and would otherwise read
// as dots tiles (allowing dragon chows and breaking half-flush detection).
export const suitOf = (t) =>
  (HONORS.includes(t) || FLOWERS.includes(t) ? null : (SUITS.includes(t[1]) ? t[1] : null));
export const numOf = (t) => (suitOf(t) ? parseInt(t[0], 10) : null);
export const isHonor = (t) => HONORS.includes(t);
export const isFlower = (t) => FLOWERS.includes(t);

export function countTiles(tiles) {
  const c = {};
  for (const t of tiles) c[t] = (c[t] || 0) + 1;
  return c;
}

export function buildWall(rng = Math.random) {
  const wall = [];
  for (const t of TILE_TYPES) for (let i = 0; i < 4; i++) wall.push(t);
  wall.push(...FLOWERS);
  for (let i = wall.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [wall[i], wall[j]] = [wall[j], wall[i]];
  }
  return wall;
}

// ---- claims --------------------------------------------------------------

export function chowOptions(hand, discarded) {
  const suit = suitOf(discarded);
  const num = numOf(discarded);
  if (!suit) return [];
  const counts = countTiles(hand);
  const opts = [];
  if (num >= 3 && counts[`${num - 2}${suit}`] > 0 && counts[`${num - 1}${suit}`] > 0)
    opts.push([`${num - 2}${suit}`, `${num - 1}${suit}`, discarded]);
  if (num >= 2 && num <= 8 && counts[`${num - 1}${suit}`] > 0 && counts[`${num + 1}${suit}`] > 0)
    opts.push([`${num - 1}${suit}`, discarded, `${num + 1}${suit}`]);
  if (num <= 7 && counts[`${num + 1}${suit}`] > 0 && counts[`${num + 2}${suit}`] > 0)
    opts.push([discarded, `${num + 1}${suit}`, `${num + 2}${suit}`]);
  return opts;
}

export const canPung = (hand, discarded) => (countTiles(hand)[discarded] || 0) >= 2;
export const canKongFromDiscard = (hand, discarded) => (countTiles(hand)[discarded] || 0) >= 3;
export function concealedKongTiles(hand) {
  const c = countTiles(hand);
  return Object.keys(c).filter((t) => c[t] >= 4);
}

// ---- win detection (recursive: pair + 4 melds) ---------------------------

function canFormMelds(counts, meldCount) {
  let first = null;
  for (const t of TILE_TYPES) if ((counts[t] || 0) > 0) { first = t; break; }
  if (!first) return meldCount === 4;

  if ((counts[first] || 0) >= 3) {
    counts[first] -= 3;
    if (canFormMelds(counts, meldCount + 1)) { counts[first] += 3; return true; }
    counts[first] += 3;
  }
  const suit = suitOf(first);
  const num = numOf(first);
  if (suit && num && num <= 7) {
    const t2 = `${num + 1}${suit}`;
    const t3 = `${num + 2}${suit}`;
    if ((counts[t2] || 0) > 0 && (counts[t3] || 0) > 0) {
      counts[first]--; counts[t2]--; counts[t3]--;
      if (canFormMelds(counts, meldCount + 1)) {
        counts[first]++; counts[t2]++; counts[t3]++;
        return true;
      }
      counts[first]++; counts[t2]++; counts[t3]++;
    }
  }
  return false;
}

// `melds` are exposed sets (3 tiles each, kong counts as one meld of 3+1);
// the concealed part must then complete (4 - melds) sets + the pair.
export function isWinningHand(hand, meldCount = 0) {
  if (hand.length !== 14 - meldCount * 3) return false;
  const counts = countTiles(hand);
  for (const pairTile of TILE_TYPES) {
    if ((counts[pairTile] || 0) >= 2) {
      counts[pairTile] -= 2;
      const need = 4 - meldCount;
      if (canFormMeldsN(counts, 0, need)) { counts[pairTile] += 2; return true; }
      counts[pairTile] += 2;
    }
  }
  return false;
}

function canFormMeldsN(counts, meldCount, need) {
  let first = null;
  for (const t of TILE_TYPES) if ((counts[t] || 0) > 0) { first = t; break; }
  if (!first) return meldCount === need;
  if ((counts[first] || 0) >= 3) {
    counts[first] -= 3;
    if (canFormMeldsN(counts, meldCount + 1, need)) { counts[first] += 3; return true; }
    counts[first] += 3;
  }
  const suit = suitOf(first);
  const num = numOf(first);
  if (suit && num && num <= 7) {
    const t2 = `${num + 1}${suit}`;
    const t3 = `${num + 2}${suit}`;
    if ((counts[t2] || 0) > 0 && (counts[t3] || 0) > 0) {
      counts[first]--; counts[t2]--; counts[t3]--;
      if (canFormMeldsN(counts, meldCount + 1, need)) {
        counts[first]++; counts[t2]++; counts[t3]++;
        return true;
      }
      counts[first]++; counts[t2]++; counts[t3]++;
    }
  }
  return false;
}

export const isWinningTile = (hand, tile, meldCount = 0) =>
  isWinningHand([...hand, tile], meldCount);

// ---- faan scoring --------------------------------------------------------

export function calculateFaan(hand, melds, seatWind, roundWind, flowers = [], seatIndex = 0) {
  let faan = 0;
  const details = [];
  const counts = countTiles(hand);

  let allPongs = (melds || []).length > 0;
  for (const m of melds || []) if (m.type === 'chi') allPongs = false;
  if (allPongs) { faan += 3; details.push('All Pongs (+3)'); }

  for (const d of DRAGONS) {
    const inMeld = (melds || []).some((m) => m.type !== 'chi' && m.tiles[0] === d);
    if ((counts[d] || 0) >= 3 || inMeld) { faan += 1; details.push(`Dragon Pong ${DISPLAY[d]} (+1)`); }
  }
  const pongOf = (t) => (counts[t] || 0) >= 3 ||
    (melds || []).some((m) => m.type !== 'chi' && m.tiles[0] === t);
  if (seatWind && pongOf(seatWind)) { faan += 1; details.push('Seat Wind Pong (+1)'); }
  if (roundWind && pongOf(roundWind)) { faan += 1; details.push('Round Wind Pong (+1)'); }

  const allTiles = [...hand, ...(melds || []).flatMap((m) => m.tiles)];
  for (const suit of SUITS) {
    let hasSuit = false, hasOther = false;
    for (const t of allTiles) {
      const ts = suitOf(t);
      if (ts === suit) hasSuit = true;
      else if (ts !== null) hasOther = true;
    }
    if (hasSuit && !hasOther) { faan += 3; details.push('Half Flush (+3)'); break; }
  }

  // Cantonese flowers: your own number (seat 0 = 1) in either series is +1
  // each; catching no flowers at all is also +1.
  const own = seatIndex + 1;
  for (const f of flowers) {
    if (parseInt(f[1], 10) === own) { faan += 1; details.push(`Own Flower ${DISPLAY[f]} (+1)`); }
  }
  if (flowers.length === 0) { faan += 1; details.push('No Flowers (+1)'); }

  faan = Math.max(faan, 1);
  return { faan, details };
}

export const faanToCoins = (faan) => Math.floor(20 * 2 ** Math.min(faan - 1, 6));

// ---- AI ------------------------------------------------------------------

export function evaluateTileValue(hand, tile) {
  const counts = countTiles(hand);
  let value = 0;
  if ((counts[tile] || 0) >= 1) value += 3;
  if ((counts[tile] || 0) >= 2) value += 5;
  const suit = suitOf(tile);
  const num = numOf(tile);
  if (suit && num) {
    if (num > 1 && (counts[`${num - 1}${suit}`] || 0) > 0) value += 2;
    if (num < 9 && (counts[`${num + 1}${suit}`] || 0) > 0) value += 2;
    if (num > 2 && (counts[`${num - 2}${suit}`] || 0) > 0) value += 1;
    if (num < 8 && (counts[`${num + 2}${suit}`] || 0) > 0) value += 1;
  }
  if (isHonor(tile) && (counts[tile] || 0) >= 1) value += 2;
  if (DRAGONS.includes(tile)) value += 1;
  return value;
}

export function aiChooseDiscard(hand) {
  let worst = hand[0];
  let worstVal = Infinity;
  for (const t of hand) {
    const v = evaluateTileValue(hand, t);
    if (v < worstVal) { worst = t; worstVal = v; }
  }
  return worst;
}

// ---- game state machine --------------------------------------------------

export const AI_NAMES = ['Ming', 'Yuki', 'Carlos'];

export function newGame(rng = Math.random) {
  const wall = buildWall(rng);
  const g = {
    wall,
    players: [0, 1, 2, 3].map((i) => ({
      name: i === 0 ? 'Jij' : AI_NAMES[i - 1],
      hand: [], melds: [], flowers: [], discards: [],
      seatWind: WINDS[i],
    })),
    roundWind: 'E',
    turn: 0,          // whose turn (0 = human)
    phase: 'draw',    // draw -> discard -> (claims) -> draw...
    lastDiscard: null,
    lastDiscarder: null,
    winner: null,
    result: null,
    drawn: false,     // wall exhausted
  };
  for (let r = 0; r < 13; r++) for (const p of g.players) drawTile(g, p);
  return g;
}

export function drawTile(g, player) {
  while (g.wall.length > 0) {
    const t = g.wall.pop();
    if (isFlower(t)) { player.flowers.push(t); continue; }
    player.hand.push(t);
    sortHand(player.hand);
    return t;
  }
  g.drawn = true;
  return null;
}

export function sortHand(hand) {
  hand.sort((a, b) => TILE_TYPES.indexOf(a) + (isFlower(a) ? 99 : 0)
    - TILE_TYPES.indexOf(b) - (isFlower(b) ? 99 : 0));
}

export function discard(g, playerIdx, tile) {
  const p = g.players[playerIdx];
  const i = p.hand.indexOf(tile);
  if (i < 0) return false;
  p.hand.splice(i, 1);
  p.discards.push(tile);
  g.lastDiscard = tile;
  g.lastDiscarder = playerIdx;
  g.phase = 'claims';
  return true;
}

// Claim priority: win > kong/pung > chow (chow only for the next seat).
export function availableClaims(g, playerIdx) {
  if (g.phase !== 'claims' || g.lastDiscard == null || playerIdx === g.lastDiscarder) return [];
  const p = g.players[playerIdx];
  const claims = [];
  if (isWinningTile(p.hand, g.lastDiscard, p.melds.length)) claims.push('win');
  if (canKongFromDiscard(p.hand, g.lastDiscard)) claims.push('kong');
  if (canPung(p.hand, g.lastDiscard)) claims.push('pung');
  if (playerIdx === (g.lastDiscarder + 1) % 4 && chowOptions(p.hand, g.lastDiscard).length) claims.push('chow');
  return claims;
}

export function applyClaim(g, playerIdx, type, chowTiles = null) {
  const p = g.players[playerIdx];
  const t = g.lastDiscard;
  g.players[g.lastDiscarder].discards.pop();
  const take = (tile, n) => {
    for (let k = 0; k < n; k++) p.hand.splice(p.hand.indexOf(tile), 1);
  };
  if (type === 'win') {
    p.hand.push(t);
    finishWin(g, playerIdx);
    return;
  }
  if (type === 'pung') { take(t, 2); p.melds.push({ type: 'pong', tiles: [t, t, t] }); }
  if (type === 'kong') { take(t, 3); p.melds.push({ type: 'kong', tiles: [t, t, t, t] }); drawTile(g, p); }
  if (type === 'chow') {
    const opt = chowTiles || chowOptions(p.hand, t)[0];
    for (const ct of opt) if (ct !== t) take(ct, 1);
    p.melds.push({ type: 'chi', tiles: opt });
  }
  g.lastDiscard = null;
  g.turn = playerIdx;
  g.phase = 'discard';
}

export function finishWin(g, playerIdx) {
  const p = g.players[playerIdx];
  const { faan, details } = calculateFaan(
    p.hand, p.melds, p.seatWind, g.roundWind, p.flowers, playerIdx);
  g.winner = playerIdx;
  g.result = { faan, details, coins: faanToCoins(faan), name: p.name };
  g.phase = 'over';
}

// Advance the game until it is the human's decision point (or game over).
// Returns a log of what the AIs did.
export function stepUntilHuman(g) {
  const log = [];
  let guard = 0;
  while (g.phase !== 'over' && !g.drawn && guard++ < 200) {
    if (g.phase === 'claims') {
      // AI claims in priority order (human claims are offered by the UI first).
      let claimed = false;
      for (const type of ['win', 'kong', 'pung']) {
        for (let i = 1; i < 4 && !claimed; i++) {
          if (availableClaims(g, i).includes(type)) {
            applyClaim(g, i, type);
            log.push(`${g.players[i].name}: ${type === 'win' ? 'WINT met de afgelegde tegel!' : type.toUpperCase()}`);
            claimed = true;
          }
        }
        if (claimed) break;
      }
      if (!claimed) {
        g.phase = 'draw';
        g.turn = (g.lastDiscarder + 1) % 4;
        g.lastDiscard = null;
      }
      if (g.phase === 'over') break;
      if (g.turn === 0 && g.phase === 'discard') break; // human got the claim
      continue;
    }
    if (g.phase === 'draw') {
      const p = g.players[g.turn];
      const t = drawTile(g, p);
      if (t == null) break;
      if (isWinningHand(p.hand, p.melds.length)) {
        if (g.turn === 0) { g.phase = 'self-win-offer'; break; }
        finishWin(g, g.turn);
        log.push(`${p.name} wint (zelf getrokken)!`);
        break;
      }
      g.phase = 'discard';
    }
    if (g.phase === 'discard') {
      if (g.turn === 0) break; // human chooses
      const p = g.players[g.turn];
      const t = aiChooseDiscard(p.hand);
      discard(g, g.turn, t);
      log.push(`${p.name} legt ${tileLabel(t)} af`);
      // before looping into claims, give the human a chance via the UI:
      if (availableClaims(g, 0).length) break;
    }
  }
  return log;
}
