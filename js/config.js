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
  footH: 26,           // vzdálenost od spodku hlavy k trávníku
  footR: 14,           // poloměr kopačky pro kolize
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

const TEAMS = [
  { name: 'MODŘÍ', short: 'modří', color: '#2f80ff', dark: '#1a4fb0', light: '#9cc2ff' },
  { name: 'ČERVENÍ', short: 'červení', color: '#f2463d', dark: '#a8221c', light: '#ffa29c' },
];

// Postavičky – vzhled hlavy. Každý zápas se náhodně rozdělí mezi hráče.
const ROSTER = [
  { name: 'Ferda', skin: '#f3c99b', hair: 'spiky', hairColor: '#f2c230', brow: '#a87a0c' },
  { name: 'Kuba', skin: '#8a5636', hair: 'afro', hairColor: '#241812', brow: '#1a110c' },
  { name: 'Olda', skin: '#e3a777', hair: 'mohawk', hairColor: '#e8452f', brow: '#7a2a1a' },
  { name: 'Bóža', skin: '#c88b5c', hair: 'bald', hairColor: '#3a281c', brow: '#2b1c12', beard: true },
  { name: 'Mates', skin: '#f6d3b3', hair: 'swoosh', hairColor: '#1d2230', brow: '#1d2230' },
  { name: 'Tonda', skin: '#f8d8c0', hair: 'curly', hairColor: '#d4651f', brow: '#a44a12', freckles: true },
];

// Obtížnost počítače: rychlost běhu, jak často se rozhoduje (s), ochota kopat a skákat,
// nepřesnost (px) a jak často se vrací bránit, když je soupeř u míče dřív.
const AI_LEVELS = {
  easy: { speed: 0.72, think: 0.17, kick: 0.45, jump: 0.4, err: 55, defend: 0.2 },
  medium: { speed: 0.88, think: 0.1, kick: 0.75, jump: 0.72, err: 22, defend: 0.6 },
  hard: { speed: 1.0, think: 0.05, kick: 0.95, jump: 0.93, err: 6, defend: 0.92 },
};

const DEFAULT_CFG = { format: '1v1', players: '1p', level: 'medium', minutes: 2 };

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

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
