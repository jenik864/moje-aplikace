'use strict';
/*
 * Hlavouni – společné konstanty a pomocné funkce.
 * Hřiště má virtuální rozměr 1280 × 720 px, vykreslení se škáluje na velikost okna.
 */

const W = 1280;
const H = 720;
const GROUND_Y = 590;            // čára, na které stojí hráči
const GOAL_W = 96;               // hloubka branky (od zadní sítě po brankovou čáru)
const GOAL_H = 180;              // výška horní hrany břevna nad trávníkem
const BAR_T = 12;                // tloušťka břevna
const BAR_Y = GROUND_Y - GOAL_H; // horní hrana břevna
const STEP = 1 / 120;            // pevný krok fyziky v sekundách

const PHYS = {
  gravity: 2300,       // gravitace hráčů (px/s²)
  moveSpeed: 420,      // maximální rychlost běhu
  accelGround: 4200,
  accelAir: 2700,
  jumpV: 860,          // rychlost odrazu při skoku
  playerR: 40,         // poloměr hlavy
  footH: 46,           // od spodku hlavy k trávníku (tělo a nohy)
  footR: 12,           // poloměr kopačky pro kolize
  bodyR: 18,           // poloměr těla pro kolize s míčem
  kickDur: 0.24,       // délka švihu nohou
  kickCooldown: 0.1,
  ballR: 17,
  ballGravity: 1300,
  ballBounce: 0.7,     // odraz od trávníku
  wallBounce: 0.78,
  headBounce: 0.55,    // odraz od hlavy
  headMinOut: 130,     // míč se od hlavy vždy odrazí aspoň touto rychlostí
  headerPush: 80,      // hlavička posílá míč trochu dopředu
  headMaxSpeed: 820,   // hlavička sama nezrychlí míč nad tuto hodnotu
  groundGrip: 0.88,    // část vodorovné rychlosti, která zůstane po dopadu
  ballMaxSpeed: 1500,
  kickSpeed: 880,
  airDrag: 0.12,
  rollFriction: 1.1,
};

// Barvy dresů v zápase 1 v 1 (vlevo, vpravo).
const SIDE_COLORS = [
  { color: '#2f80ff', dark: '#1a4fb0', light: '#9cc2ff' },
  { color: '#f2463d', dark: '#a8221c', light: '#ffa29c' },
];

// Týmy pro 2 v 2.
const DUO_TEAMS = [
  { name: 'NELCIS & MAJDA', short: 'Nelcis a Majda', girls: true, color: '#e8458f', dark: '#9e1f5c', light: '#ffb0d4', chars: ['nelcis', 'majda'] },
  { name: 'MARSAL & DURCADO', short: 'Marsal a Durcado', girls: false, color: '#2f80ff', dark: '#1a4fb0', light: '#9cc2ff', chars: ['marsal', 'durcado'] },
];

// Postavy. hair = účes, accent = doplněk (gumička, mašle).
const ROSTER = [
  { id: 'nelcis', name: 'Nelcis', girl: true, num: 7, skin: '#f7d2b6', hair: 'ponytail', hairColor: '#7b4a2b', eyes: '#3f9160', brow: '#5b3520', accent: '#ffd23f' },
  { id: 'majda', name: 'Majda', girl: true, num: 10, skin: '#f9dcc6', hair: 'long', hairColor: '#e7bf62', eyes: '#3a78d6', brow: '#a9802f', accent: '#ff5fa2' },
  { id: 'marsal', name: 'Marsal', num: 9, skin: '#efc29c', hair: 'quiff', hairColor: '#2d1e17', eyes: '#6b4428', brow: '#21160f' },
  { id: 'durcado', name: 'Durcado', num: 11, skin: '#f4cba8', hair: 'cap', hairColor: '#7a5132', eyes: '#3a78d6', brow: '#4f331f' },
  { id: 'ferda', name: 'Ferda', num: 4, skin: '#f3c99b', hair: 'spiky', hairColor: '#f2c230', eyes: '#3a78d6', brow: '#a87a0c' },
  { id: 'kuba', name: 'Kuba', num: 8, skin: '#8a5636', hair: 'afro', hairColor: '#241812', eyes: '#3b2416', brow: '#1a110c' },
  { id: 'olda', name: 'Olda', num: 5, skin: '#e3a777', hair: 'mohawk', hairColor: '#e8452f', eyes: '#5a3a1e', brow: '#7a2a1a' },
  { id: 'boza', name: 'Bóža', num: 3, skin: '#c88b5c', hair: 'bald', hairColor: '#3a281c', eyes: '#4a2f1a', brow: '#2b1c12', beard: true },
  { id: 'mates', name: 'Mates', num: 6, skin: '#f6d3b3', hair: 'swoosh', hairColor: '#1d2230', eyes: '#4c7a3f', brow: '#1d2230' },
  { id: 'tonda', name: 'Tonda', num: 2, skin: '#f8d8c0', hair: 'curly', hairColor: '#d4651f', eyes: '#3f8a5a', brow: '#a44a12', freckles: true },
];
const charById = (id) => ROSTER.find((c) => c.id === id) || ROSTER[0];

// Obtížnost počítače: rychlost běhu, jak často se rozhoduje (s), ochota kopat a skákat,
// nepřesnost (px) a jak často se vrací bránit, když je soupeř u míče dřív.
const AI_LEVELS = {
  easy: { speed: 0.72, think: 0.17, kick: 0.45, jump: 0.4, err: 55, defend: 0.2 },
  medium: { speed: 0.88, think: 0.1, kick: 0.75, jump: 0.72, err: 22, defend: 0.6 },
  hard: { speed: 1.0, think: 0.05, kick: 0.95, jump: 0.93, err: 6, defend: 0.92 },
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const approach = (v, target, d) => (v < target ? Math.min(v + d, target) : Math.max(v - d, target));
const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const randomId = (n = 8) => Math.random().toString(36).slice(2, 2 + n).padEnd(n, '0');

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Ztmavení (amt < 0) nebo zesvětlení (amt > 0) barvy #rrggbb.
const _shadeCache = new Map();
function shade(hex, amt) {
  const key = hex + amt;
  let out = _shadeCache.get(key);
  if (out) return out;
  const n = parseInt(hex.slice(1), 16);
  const t = amt < 0 ? 0 : 255, k = Math.abs(amt);
  const ch = (v) => Math.round(v + (t - v) * k);
  out = `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
  _shadeCache.set(key, out);
  return out;
}
