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
const KICKOFF_Y = 286;           // odkud se při výkopu pustí míč (pod velkou obrazovkou)

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

// Dvojice pro 2 v 2 (v lobby se vybírají dvě z nich).
const DUO_TEAMS = [
  { name: 'NELCIS & MAJDA', short: 'Nelcis a Majda', girls: true, color: '#e8458f', dark: '#9e1f5c', light: '#ffb0d4', chars: ['nelcis', 'majda'] },
  { name: 'MARSAL & DURCADO', short: 'Marsal a Durcado', girls: false, color: '#2f80ff', dark: '#1a4fb0', light: '#9cc2ff', chars: ['marsal', 'durcado'] },
  { name: 'TÓMA & PELI', short: 'Tóma a Peli', girls: false, color: '#1fae66', dark: '#0d7040', light: '#a5f0c8', chars: ['toma', 'peli'] },
  { name: 'BÉMIČ & KIKI', short: 'Bémič a Kiki', girls: false, color: '#ff8a1f', dark: '#b85400', light: '#ffd3a6', chars: ['bemic', 'kiki'] },
];

// Veřejná adresa hry (GitHub Pages) – online tam funguje bez účtu na claude.ai.
const PUBLIC_URL = 'https://jenik864.github.io/moje-aplikace/';

// Postavy. hair = účes, accent = doplněk (gumička, mašle, náušnice).
const ROSTER = [
  { id: 'nelcis', name: 'Nelcis', girl: true, num: 7, skin: '#f7d6bf', hair: 'ponytail', hairColor: '#f1cd6c', hairDark: '#b2832a', hairLight: '#fff1b8', eyes: '#3d8f6c', brow: '#a8833f', accent: '#ff6fb0' },
  { id: 'majda', name: 'Majda', girl: true, num: 10, skin: '#f4d1b6', hair: 'long', hairColor: '#6d3f22', hairDark: '#3d2211', hairLight: '#a86f43', eyes: '#6a4426', brow: '#4a2a16', accent: '#ffd23f' },
  { id: 'marsal', name: 'Marsal', num: 9, skin: '#f3cdac', hair: 'quiff', hairColor: '#ebc65f', hairDark: '#a98326', hairLight: '#fff2b0', eyes: '#3a78d6', brow: '#b08b3c' },
  { id: 'durcado', name: 'Durcado', num: 11, skin: '#f1c6a6', hair: 'wavy', hairColor: '#8e5d34', hairDark: '#4f321b', hairLight: '#d09a5c', eyes: '#6f93ad', brow: '#5a3a20' },
  { id: 'toma', name: 'Tóma', num: 5, skin: '#f2c9a6', hair: 'messy', hairColor: '#5b3a21', hairDark: '#2e1b0e', hairLight: '#946642', eyes: '#5b4632', brow: '#3e2814' },
  { id: 'peli', name: 'Peli', num: 8, skin: '#eebf98', hair: 'buzz', hairColor: '#24212a', hairDark: '#08070a', hairLight: '#5d5869', eyes: '#3c2a1c', brow: '#1d1814' },
  { id: 'bemic', name: 'Bémič', num: 14, skin: '#f6d2b8', hair: 'spiky', hairColor: '#d8642a', hairDark: '#87340f', hairLight: '#ffb37c', eyes: '#3e8a5e', brow: '#9a4518', freckles: true },
  { id: 'kiki', name: 'Kiki', girl: true, num: 3, skin: '#f3cdb0', hair: 'buns', hairColor: '#3b2519', hairDark: '#1b0f08', hairLight: '#7b5238', eyes: '#5a3a22', brow: '#2e1a10', accent: '#53d2ff' },
];
// Do které dvojice postava patří (kvůli barvě dresu v 1 v 1).
const duoOf = (id) => DUO_TEAMS.findIndex((d) => d.chars.includes(id));
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
