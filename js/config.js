'use strict';
/*
 * FIFA67 – společné konstanty a pomocné funkce.
 * Hřiště má virtuální rozměr 1280 × 720 px, vykreslení se škáluje na velikost okna.
 */

const W = 1280;
const H = 720;
const GROUND_Y = 590;            // čára, na které stojí hráči
const PS = 1.25;                 // velikost postav oproti základní kresbě
const GOAL_W = 120;              // hloubka branky (od zadní sítě po brankovou čáru)
const GOAL_H = 228;              // výška horní hrany břevna nad trávníkem
const BAR_T = 12;                // tloušťka břevna
const BAR_Y = GROUND_Y - GOAL_H; // horní hrana břevna
const STEP = 1 / 120;            // pevný krok fyziky v sekundách
const KICKOFF_Y = 286;           // odkud se při výkopu pustí míč (pod velkou obrazovkou)

const PHYS = {
  gravity: 2300,       // gravitace hráčů (px/s²)
  moveSpeed: 420,      // maximální rychlost běhu
  accelGround: 4200,
  accelAir: 2700,
  jumpV: 910,          // rychlost odrazu při skoku
  playerR: 40 * PS,    // poloměr hlavy
  footH: 46 * PS,      // od spodku hlavy k trávníku (tělo a nohy)
  footR: 12 * PS,      // poloměr kopačky pro kolize
  bodyR: 18 * PS,      // poloměr těla pro kolize s míčem
  bodyOff: 18 * PS,    // střed těla pod spodkem hlavy
  kickDur: 0.24,       // délka švihu nohou
  kickWindow: 0.85,    // jak dlouho během švihu může kopačka trefit míč (část švihu)
  kickReach: 16,       // o kolik je zásah kopačkou shovívavější než její velikost
  kickCooldown: 0.1,
  ballR: 24,           // větší míč = lépe se trefuje
  ballGravity: 1300,
  ballBounce: 0.7,     // odraz od trávníku
  wallBounce: 0.78,
  headBounce: 0.55,    // odraz od hlavy
  headMinOut: 130,     // míč se od hlavy vždy odrazí aspoň touto rychlostí
  headerPush: 120,     // hlavička posílá míč dopředu
  headMaxSpeed: 820,   // hlavička sama nezrychlí míč nad tuto hodnotu
  groundGrip: 0.88,    // část vodorovné rychlosti, která zůstane po dopadu
  ballMaxSpeed: 1500,
  superCharge: 15,     // za kolik sekund se nabije superstřela
  superSpeed: 1450,    // rychlost superstřely
  knockVX: 820,        // superstřela odstřelí soupeře: vodorovně
  knockVY: 820,        //   a nahoru
  stunTime: 1.6,       // jak dlouho je odstřelený hráč omámený
  kickSpeed: 880,
  airDrag: 0.12,
  rollFriction: 1.1,
};

// Arény: každá mění vzhled i to, jak se hraje.
//  speed = rychlost běhu, jump = odraz, grav = gravitace hráčů, ballGrav = gravitace míče,
//  roll = tření míče po zemi, grip = kolik rychlosti míči zůstane po dopadu, bounce = odraz míče,
//  wind = síla větru (mění směr), ice = led (pomalý rozjezd, dlouhé dojíždění).
const ARENAS = {
  stadium: { name: 'Stadion', icon: '🏟️' },
  snow: { name: 'Sníh', icon: '❄️', tip: 'LED – VŠICHNI KLOUŽOU', ice: true, roll: 0.2, grip: 1.12 },
  beach: { name: 'Pláž', icon: '🏖️', tip: 'PÍSEK – POMALÉ NOHY, MÍČ BRZDÍ', speed: 0.8, roll: 3.5, grip: 0.55, bounce: 0.45 },
  moon: { name: 'Měsíc', icon: '🌙', tip: 'NÍZKÁ GRAVITACE – SKÁČE SE DO NEBE', grav: 0.4, ballGrav: 0.38, jump: 0.78 },
  wind: { name: 'Vichřice', icon: '🌪️', tip: 'VÍTR MĚNÍ SMĚR – SLEDUJ ŠIPKU', wind: 520 },
};
const ARENA_ORDER = ['stadium', 'snow', 'beach', 'moon', 'wind'];
const validArena = (a) => (ARENAS[a] ? a : 'stadium');
function arenaMods(a) {
  const A = ARENAS[validArena(a)];
  return {
    speed: A.speed || 1, jump: A.jump || 1, grav: A.grav || 1, ballGrav: A.ballGrav || 1,
    roll: A.roll || 1, grip: A.grip || 1, bounce: A.bounce || 1, wind: A.wind || 0, ice: !!A.ice,
  };
}
const ICE = {
  accel: 0.3,  // rozjezd a zatáčení na ledu (část běžného)
  brake: 0.22, // brzdění bez ovládání
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
  { name: 'ŠIMŠA & JENDA', short: 'Šimša a Jenda', girls: false, color: '#8b5cf6', dark: '#5527c4', light: '#d6c6ff', chars: ['simsa', 'jenda'] },
  // odemkne se v příběhu (úroveň 10)
  { name: 'TLUSTEJ PÁV & SULI', short: 'Páv a Suli', girls: false, color: '#0e8a8f', dark: '#075457', light: '#8ef0e6', chars: ['pav', 'sully'], locked: 'pav' },
  // vietnamská reprezentace (jen ve výzvě Vietnam)
  { name: 'MINH & TUẤN', short: 'Minh a Tuấn', girls: false, color: '#da251d', dark: '#9b1410', light: '#ffd84a', chars: ['v_minh', 'v_tuan'], locked: 'never', viet: true },
  { name: 'LONG & HUY', short: 'Long a Huy', girls: false, color: '#da251d', dark: '#9b1410', light: '#ffd84a', chars: ['v_long', 'v_huy'], locked: 'never', viet: true },
  { name: 'PHONG & NAM', short: 'Phong a Nam', girls: false, color: '#da251d', dark: '#9b1410', light: '#ffd84a', chars: ['v_phong', 'v_nam'], locked: 'never', viet: true },
  { name: 'KHOA & BẢO', short: 'Khoa a Bảo', girls: false, color: '#da251d', dark: '#9b1410', light: '#ffd84a', chars: ['v_khoa', 'v_bao'], locked: 'never', viet: true },
  { name: 'DUY & HIẾU', short: 'Duy a Hiếu', girls: false, color: '#da251d', dark: '#9b1410', light: '#ffd84a', chars: ['v_duy', 'v_hieu'], locked: 'never', viet: true },
  // odemknou se v kampani Točná (úroveň 10 a 17)
  { name: 'BÉMIČ Š. & BERRY', short: 'Bémič Š. a Berry', girls: false, color: '#7a5cff', dark: '#4b33b8', light: '#d8ccff', chars: ['bemics', 'berry'], locked: 'berry' },
  { name: 'NIKOL & LUĎAN', short: 'Nikol a Luďan', girls: false, color: '#ff6a3d', dark: '#b83c18', light: '#ffd1bf', chars: ['nikol', 'ludan'], locked: 'nikol' },
];
// Dvojice je k dispozici (zamčená až po odemčení v příběhu).
const duoAvailable = (i) => !!DUO_TEAMS[i] && (!DUO_TEAMS[i].locked || Unlocks.has(DUO_TEAMS[i].locked));

// Verze hry (vidět dole v menu, aby šlo poznat, jestli už běží nejnovější).
const GAME_VERSION = '1.55';
// Hra je zablokovaná: po otevření se ukáže jen výzva, ať si hráč najde práci.
// Kdo třikrát rychle klepne na hlavu rozhodčího a zadá tajný kód, hraje dál (na tom zařízení).
const GAME_BLOCKED = true;
const BLOCK_CODE = '6db84fed';
const BLOCK_PASS_KEY = 'hlavouni.pust2'; // odemknutí blokace platí jen v tomhle zařízení (nesynchronizuje se s účtem)
const JOB_URL = 'https://www.uradprace.cz/';

// Veřejná adresa hry (GitHub Pages) – online tam funguje bez účtu na claude.ai.
const PUBLIC_URL = 'https://jenik864.github.io/moje-aplikace/';

// Postavy. hair = účes, accent = doplněk (gumička, mašle, náušnice).
const ROSTER = [
  // lid = jak moc víčko zakrývá oko (vážný pohled), browW = síla obočí, mouth = smile | flat | smirk
  { id: 'nelcis', name: 'Nelcis', girl: true, num: 7, skin: '#f7d6bf', hair: 'longhair', fringe: 'side', hairColor: '#f1cd6c', hairDark: '#b2832a', hairLight: '#fff1b8', eyes: '#3d8f6c', brow: '#a8833f', accent: '#ff6fb0' },
  { id: 'majda', name: 'Majda', girl: true, num: 10, skin: '#f4d1b6', hair: 'longhair', fringe: 'curtain', hairColor: '#6d3f22', hairDark: '#3d2211', hairLight: '#a86f43', eyes: '#6a4426', brow: '#4a2a16', accent: '#ffd23f', pierce: '#e9edf3' },
  { id: 'marsal', name: 'Marsal', num: 9, skin: '#f3cdac', hair: 'wavyshort', hairColor: '#e4bf63', hairDark: '#a07a26', hairLight: '#fff0b4', eyes: '#3a78d6', brow: '#b08b3c', tall: 1.2, lid: 0.12 },
  { id: 'durcado', name: 'Durcado', num: 11, skin: '#f2c8a8', hair: 'curlytop', hairColor: '#a2703d', hairDark: '#5a3818', hairLight: '#d6a564', eyes: '#7c95a9', brow: '#5d3c1e', freckles: 'light', lid: 0.3, browW: 4, browFlat: true, mouth: 'flat' },
  { id: 'toma', name: 'Tóma', num: 5, skin: '#f2c9a6', hair: 'messy', hairColor: '#5b3a21', hairDark: '#2e1b0e', hairLight: '#946642', eyes: '#5b4632', brow: '#3e2814' },
  { id: 'peli', name: 'Peli', num: 8, skin: '#eebf98', hair: 'side', hairColor: '#3b2a1c', hairDark: '#1a110a', hairLight: '#6a4d34', eyes: '#3c2a1c', brow: '#1d1814' },
  { id: 'bemic', name: 'Bémič', num: 14, skin: '#f1c9a8', hair: 'buzz', hairColor: '#1c1a1f', hairDark: '#050506', hairLight: '#4a4652', eyes: '#3b2718', brow: '#16110e', lid: 0.15, browW: 3.8 },
  { id: 'kiki', name: 'Kiki', girl: true, num: 3, skin: '#f5d2b6', hair: 'longhair', fringe: 'bangs', wavy: true, hairColor: '#b8975c', hairDark: '#6f5428', hairLight: '#e6cd96', eyes: '#5a4126', brow: '#8a6a3a', accent: '#53d2ff' },
  { id: 'simsa', name: 'Šimša', num: 87, skin: '#f3caa8', hair: 'curlyshort', hairColor: '#4a2e19', hairDark: '#22130a', hairLight: '#7a5436', eyes: '#4a3020', brow: '#2c1a0f', lid: 0.34, browW: 4.4, browFlat: true, mouth: 'flat' },
  { id: 'jenda', name: 'Jenda', num: 21, skin: '#f0c7a6', hair: 'shaggy', hairColor: '#5c3d22', hairDark: '#2b190b', hairLight: '#8f6844', eyes: '#5e4a33', brow: '#3a2614', lid: 0.32, browW: 3.4, mouth: 'smirk' },
  // odemkne se v příběhu (úroveň 10)
  { id: 'pav', name: 'Tlustej páv', short: 'Páv', num: 99, skin: '#efc3a0', hair: 'side', hairColor: '#b8975c', hairDark: '#6f5428', hairLight: '#e6cd96', eyes: '#4a3424', brow: '#8a6a3a', chub: 1.75, beard: true, lid: 0.1, locked: 'pav' },
  { id: 'sully', name: 'Suli', girl: true, num: 17, skin: '#f3cfb4', hair: 'longhair', fringe: 'curtain', wavy: true, hairColor: '#f3dc96', hairDark: '#b08f45', hairLight: '#fffae0', eyes: '#3d6f8f', brow: '#b3924f', accent: '#7ee8d8', curvy: true, flashPose: true, locked: 'pav' },
  // odemkne se za 5. zápas výzvy Vietnam
  { id: 'trana', name: 'Tráňa', num: 88, skin: '#e8bf93', hair: 'bangs', hairColor: '#141110', hairDark: '#040303', hairLight: '#3a322c', eyes: '#24160c', brow: '#120e0c', lid: 0.34, browW: 3.6, browFlat: true, mouth: 'smirk', locked: 'trana', kit: { color: '#e6e8ec', dark: '#b9bec8', light: '#1c2230', num: '#1c2230' } },
  // odemknou se v kampani Točná
  { id: 'bemics', name: 'Bémič Š.', num: 41, skin: '#efc6a2', hair: 'side', hairColor: '#3b2414', hairDark: '#170c05', hairLight: '#6e4a30', eyes: '#3a5d7a', brow: '#2a1a0e', lid: 0.2, browW: 3.6, mouth: 'smirk', locked: 'berry' },
  { id: 'berry', name: 'Berry', num: 1, skin: '#f6f2ec', hair: 'bunny', hairColor: '#f6f2ec', hairDark: '#b9b0a4', hairLight: '#ffffff', eyes: '#1a1210', brow: '#f6f2ec', browW: 0.1, lid: 0, bunny: true, locked: 'berry' },
  { id: 'nikol', name: 'Nikol', girl: true, num: 22, skin: '#f0c8a8', hair: 'longhair', fringe: 'curtain', wavy: true, hairColor: '#7a4e2c', hairDark: '#3f2512', hairLight: '#c8955f', eyes: '#5a6a3e', brow: '#4a2c16', accent: '#ff8fb0', noBow: true, locked: 'nikol' },
  { id: 'ludan', name: 'Luďan', num: 77, skin: '#f2c3a2', hair: 'bald', hairColor: '#b8582a', hairDark: '#7a3414', hairLight: '#e08a52', eyes: '#7d8a58', brow: '#b8582a', lid: 0.18, browW: 3.4, beard: 'full', locked: 'nikol' },
  // vietnamská reprezentace (soupeři ve výzvě Vietnam, nedají se vybrat)
  { id: 'v_minh', name: 'Minh', num: 7, skin: '#e9c196', hair: 'bangs', hairColor: '#141110', hairDark: '#040303', hairLight: '#3a322c', eyes: '#24160c', brow: '#120e0c', lid: 0.32, browW: 3.6, browFlat: true, hidden: true, locked: 'never', viet: true },
  { id: 'v_tuan', name: 'Tuấn', num: 9, skin: '#e2b68a', hair: 'side', hairColor: '#141110', hairDark: '#040303', hairLight: '#3a322c', eyes: '#24160c', brow: '#120e0c', lid: 0.34, browW: 3.6, browFlat: true, mouth: 'smirk', hidden: true, locked: 'never', viet: true },
  { id: 'v_long', name: 'Long', num: 10, skin: '#dcae82', hair: 'bangs', hairColor: '#141110', hairDark: '#040303', hairLight: '#3a322c', eyes: '#24160c', brow: '#120e0c', lid: 0.3, browW: 3.6, browFlat: true, hidden: true, locked: 'never', viet: true },
  { id: 'v_huy', name: 'Huy', num: 11, skin: '#eec79f', hair: 'buzz', hairColor: '#141110', hairDark: '#040303', hairLight: '#3a322c', eyes: '#24160c', brow: '#120e0c', lid: 0.36, browW: 3.6, browFlat: true, mouth: 'flat', hidden: true, locked: 'never', viet: true },
  { id: 'v_phong', name: 'Phong', num: 4, skin: '#d9a87c', hair: 'fade', hairColor: '#141110', hairDark: '#040303', hairLight: '#3a322c', eyes: '#24160c', brow: '#120e0c', lid: 0.32, browW: 3.6, browFlat: true, hidden: true, locked: 'never', viet: true },
  { id: 'v_nam', name: 'Nam', num: 5, skin: '#e9c196', hair: 'bangs', hairColor: '#141110', hairDark: '#040303', hairLight: '#3a322c', eyes: '#24160c', brow: '#120e0c', lid: 0.34, browW: 3.6, browFlat: true, mouth: 'smirk', hidden: true, locked: 'never', viet: true },
  { id: 'v_khoa', name: 'Khoa', num: 8, skin: '#e2b68a', hair: 'side', hairColor: '#141110', hairDark: '#040303', hairLight: '#3a322c', eyes: '#24160c', brow: '#120e0c', lid: 0.36, browW: 3.6, browFlat: true, mouth: 'flat', hidden: true, locked: 'never', viet: true },
  { id: 'v_bao', name: 'Bảo', num: 19, skin: '#dcae82', hair: 'bangs', hairColor: '#141110', hairDark: '#040303', hairLight: '#3a322c', eyes: '#24160c', brow: '#120e0c', lid: 0.3, browW: 3.6, browFlat: true, hidden: true, locked: 'never', viet: true },
  { id: 'v_duy', name: 'Duy', num: 16, skin: '#eec79f', hair: 'bangs', hairColor: '#141110', hairDark: '#040303', hairLight: '#3a322c', eyes: '#24160c', brow: '#120e0c', lid: 0.34, browW: 3.6, browFlat: true, mouth: 'smirk', hidden: true, locked: 'never', viet: true },
  { id: 'v_hieu', name: 'Hiếu', num: 23, skin: '#d9a87c', hair: 'fade', hairColor: '#141110', hairDark: '#040303', hairLight: '#3a322c', eyes: '#24160c', brow: '#120e0c', lid: 0.36, browW: 3.6, browFlat: true, mouth: 'flat', hidden: true, locked: 'never', viet: true },
  // boss příběhu, jako hráč se odemkne úkolem (15 odehraných zápasů)
  { id: 'milan', name: 'Milan', num: 90, skin: '#f1c2a0', hair: 'receding', hairColor: '#c9a66a', hairDark: '#8a6a34', hairLight: '#ecd39c', eyes: '#86a0b4', brow: '#a8895a', lid: 0.24, browW: 3.4, mouth: 'flat', stubble: true, locked: 'milan', kit: { color: '#25282f', dark: '#121419', light: '#ffd23f' } },
];

// Superschopnost postavy (zatím superstřela v barvě postavy; schopnosti doladíme).
// Oslovení (5. pád) do pokřiků fanoušků a předzápasové hlášky postav.
const VOCATIVE = {
  nelcis: 'Nelcis', majda: 'Majdo', marsal: 'Marsale', durcado: 'Durcado', toma: 'Tómo',
  peli: 'Peli', bemic: 'Bémiči', kiki: 'Kiki', simsa: 'Šimšo', jenda: 'Jendo', milan: 'Milane', pav: 'Páve', sully: 'Suli',
};
const QUIPS = {
  nelcis: ['Tohle vyhrajeme levou zadní!', 'Připravte se prohrát!'],
  majda: ['Dneska dám hattrick!', 'Majda je v ráži!'],
  marsal: ['Moje patka trefí cokoli!', 'Dneska nedostaneme gól!'],
  durcado: ['Moje hlava je zbraň!', 'Na mě si nepřijdete!'],
  toma: ['Jdeme na ně, kluci!', 'Tóma se nezastaví!'],
  peli: ['Ani neuvidíte míč!', 'Rychlejší jsem jen já!'],
  bemic: ['Zrzavá bomba je tady!', 'Bémič střílí, Bémič skóruje!'],
  kiki: ['Kiki nikdy neprohrává!', 'Hlavně se nebojte!'],
  simsa: ['Šimša jde na věc!', 'Tenhle zápas je můj!'],
  jenda: ['Jenda dává góly!', 'Dneska vás rozstřílíme!'],
  milan: ['Tohle odpískám po svém!', 'Žlutá? Rovnou červená!'],
  pav: ['Páv je tady, uhněte!', 'Tohle sním i s míčem!'],
  sully: ['Suli to rozhodne!', 'Dneska bez slitování!'],
};
const QUIPS_ANY = ['Dneska padne gól za gólem!', 'Na tohle jsem čekal!', 'Pojďte na to!', 'Vy jste ty soupeři? Haha!'];
// Pokřiky z tribun ({V} = oslovení hráče, {T} = jméno dvojice).
// Fanoušci volají jen tyhle pokřiky (a jména hráčů svého týmu).
const SHOUTS = {
  crowd: ['KIKI KIKI', 'VIKY VIKY', 'SULI SULI', 'SULI TI DÁ', 'MAGDI MAGDI'],
  knock: 'SLAJZNUL DO BAHNA', // když je někdo omráčený míčem
  goal: 'GÓL',
};

// Pokřiky fanoušků konkrétních dvojic (index jako v DUO_TEAMS).
const DUO_SHOUTS = [
  [],
  ['JIŽNÍ SUPY', 'CP COMPANY'],
  ['TÓMA ŽLOUTEK'],
  ['JONY, KIKI TĚ CHCE', 'SKIPER'],
  ['MÁ VO2max 67'],
  ['TLUSTEJ PÁV', 'SULI SULI'],
  ['VIỆT NAM VÔ ĐỊCH'], ['VIỆT NAM VÔ ĐỊCH'], ['VIỆT NAM VÔ ĐỊCH'], ['VIỆT NAM VÔ ĐỊCH'], ['VIỆT NAM VÔ ĐỊCH'],
  ['BERRY BERRY', 'TOČNÁ'],
  ['NIKOL NIKOL', 'LUĎAN LUĎAN'],
];

// Odemčené věci na tomto zařízení (příběh, odměny).
const UNLOCK_KEY = 'hlavouni.odemceno';
const Unlocks = {
  get() {
    try {
      const o = JSON.parse(localStorage.getItem(UNLOCK_KEY));
      if (!o || typeof o !== 'object') return {};
      // starší verze: zlatý dres = skin Moncler-Jenda
      if (o.gold) o.moncler = true;
      if (o.goldOn || o.skinOn) o['on.moncler'] = true;
      return o;
    } catch (e) {
      return {};
    }
  },
  has(k) {
    return !!this.get()[k];
  },
  set(k, v = true) {
    const o = this.get();
    if (v) o[k] = true;
    else delete o[k];
    try { localStorage.setItem(UNLOCK_KEY, JSON.stringify(o)); } catch (e) { /* nevadí */ }
  },
};
// Postava je k dispozici (zamčené až po odemčení).
const charAvailable = (c) => !c.locked || Unlocks.has(c.locked);
// Postava se ukáže ve výběru (boss jen když už je odemčený).
const charListed = (c) => !c.hidden || charAvailable(c);
const MONCLER_KIT = { name: 'MONCLER-JENDA', short: 'Moncler-Jenda', color: '#f7f8fa', dark: '#cfd5de', light: '#1c2230', num: '#1c2230' };
// TRUE GOLD KIKI: celá ze zlata (bonus za 4. úroveň Příběhu bez obdrženého gólu)
const TRUEGOLD_KIT = { name: 'TRUE GOLD', short: 'True Gold', color: '#ffcf3a', dark: '#b8860b', light: '#fff3b0', num: '#5a3d00' };
// Skiny postav: každý patří jedné postavě, zapíná se u ní (v lobby, v Příběhu nebo v Úkolech).
const SKINS = {
  moncler: { char: 'jenda', name: 'Moncler-Jenda', short: 'Moncler', kit: MONCLER_KIT },
  bikini: { char: 'kiki', name: 'Kiki v bikinách', short: 'Bikiny' },
  truegold: { char: 'kiki', name: 'True Gold Kiki', short: 'Gold', kit: TRUEGOLD_KIT, look: { skin: '#f2c14e', hairColor: '#ffd84a', hairDark: '#a87412', hairLight: '#fff6c2', brow: '#a87412', eyes: '#7a4a08', accent: '#fff6c2', crown: true } },
  // červený basketbalový dres bez rukávů s číslem 23 (bez loga klubu)
  michael: { char: 'bemic', name: 'Michael Bémič', short: 'Michael', kit: { name: 'MICHAEL', short: 'Michael', color: '#ce1141', dark: '#8f0a2c', light: '#111111', num: '#ffffff' }, look: { num: 23, skin: '#7a4b30', hair: 'bald', brow: '#1d130c', eyes: '#2f1d12', hairColor: '#2a1a10', hairDark: '#120a05', hairLight: '#5a3a24' } },
};
const skinOwned = (id) => !!SKINS[id] && Unlocks.has(id);
const skinOn = (id) => skinOwned(id) && Unlocks.has('on.' + id);
// skin, který mám vlastněný pro postavu (a jestli je zapnutý)
const ownedSkinsFor = (charId) => Object.keys(SKINS).filter((id) => SKINS[id].char === charId && skinOwned(id));
const ownedSkinFor = (charId) => ownedSkinsFor(charId)[0] || '';
const mySkinFor = (charId) => ownedSkinsFor(charId).find((id) => skinOn(id)) || '';
function mySkins() {
  const o = {};
  for (const id of Object.keys(SKINS)) if (skinOn(id)) o[SKINS[id].char] = id;
  return o;
}
// skiny od kamaráda (z presence) – jen platné dvojice postava → skin
function cleanSkins(x) {
  const o = {};
  if (x && typeof x === 'object') for (const id of Object.keys(SKINS)) if (x[SKINS[id].char] === id) o[SKINS[id].char] = id;
  return o;
}
// vzhled postavy se skinem (Michael Bémič má jinou barvu kůže a je holohlavý)
const _skinLooks = new Map();
function lookFor(charId, skin) {
  const base = charById(charId);
  const sk = SKINS[skin];
  if (!sk || sk.char !== base.id || !sk.look) return base;
  const key = base.id + ':' + skin;
  if (!_skinLooks.has(key)) _skinLooks.set(key, Object.assign({}, base, sk.look));
  return _skinLooks.get(key);
}

// Úkoly (postup se ukládá v zařízení).
const TASKS = [
  { id: 'milan', title: 'Odehraj 15 zápasů', goal: 15, reward: 'milan', kind: 'char', char: 'milan', name: 'MILAN VORAČKA', text: 'Rozhodčí jako hráč, schopnost Červená karta.' },
  { id: 'bikini', title: 'Dej 15 gólů v jednom zápase', goal: 15, reward: 'bikini', kind: 'skin', char: 'kiki', name: 'KIKI V BIKINÁCH', text: 'Plážový skin pro Kiki: plavky a sluneční brýle.' },
  { id: 'michael', title: 'Dej 30 gólů za Bémiče', goal: 30, reward: 'michael', kind: 'skin', char: 'bemic', name: 'MICHAEL BÉMIČ', text: 'Skin pro Bémiče: holohlavý, tmavá kůže a červený basketbalový dres s číslem 23.' },
];
const TASK_KEY = 'hlavouni.ukoly';
const Tasks = {
  get() {
    try {
      const o = JSON.parse(localStorage.getItem(TASK_KEY)) || {};
      return { bestGoals: Math.max(0, Number(o.bestGoals) || 0), bemicGoals: Math.max(0, Number(o.bemicGoals) || 0) };
    } catch (e) {
      return { bestGoals: 0, bemicGoals: 0 };
    }
  },
  save(o) {
    try { localStorage.setItem(TASK_KEY, JSON.stringify(o)); } catch (e) { /* nevadí */ }
  },
  progress(t) {
    if (t.id === 'milan') return Profile.get().played;
    const o = this.get();
    return t.id === 'bikini' ? o.bestGoals : o.bemicGoals;
  },
  // po zápase: zapsat góly a vrátit nově splněné úkoly
  record(charId, goals) {
    const o = this.get();
    o.bestGoals = Math.max(o.bestGoals, goals);
    if (charId === 'bemic') o.bemicGoals += goals;
    this.save(o);
    const fresh = [];
    for (const t of TASKS) {
      if (Unlocks.has(t.reward) || this.progress(t) < t.goal) continue;
      Unlocks.set(t.reward);
      if (t.kind === 'skin') Unlocks.set('on.' + t.reward);
      fresh.push(t);
    }
    return fresh;
  },
};

// Příběh: 10 úrovní, každá jeden zápas 1 v 1. Odemyká se kódem (uložen jen hash).
const STORY_CODE = 'a693ac71';
const MASTER_CODE = '42369a8e'; // odemkne úplně všechno
function codeHash(s) {
  let h = 0x811c9dc5;
  for (const ch of s) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16);
}
// format 1v1: opp = soupeř; 2v2: duo = dvojice soupeřů (hraješ se spoluhráčem z tvé dvojice).
// goal: podmínka výhry – by (rozdíl gólů), clean (bez obdrženého gólu), goals (aspoň tolik gólů).
const STORY = [
  { format: '1v1', opp: 'toma', level: 'easy', boost: 1, goal: {}, title: 'Sídlištní plácek', text: 'Tóma tě vyzve na první zápas. Ukaž, co v tobě je!' },
  { format: '1v1', opp: 'peli', level: 'easy', boost: 1.05, goal: { by: 2 }, arena: 'beach', title: 'Plážový turnaj', text: 'Peli je rychlík, ale v písku se běhá pomalu. Musí to být jasná výhra.' },
  { format: '2v2', duo: 2, level: 'medium', boost: 1, goal: {}, title: 'Odveta na sídlišti', text: 'Tóma a Peli si přivedli posilu. Hraje se 2 na 2, spoluhráče máš z tvé dvojice.' },
  { format: '1v1', opp: 'kiki', level: 'medium', boost: 1.05, goal: { maxConceded: 1 }, bonus: { goal: { clean: true }, reward: 'truegold' }, title: 'Okresní přebor', text: 'Kiki nikdy neprohrává. Na postup ji porazíš a dostaneš nejvýš jeden gól – a když nedostaneš žádný, získáš TRUE GOLD KIKI!' },
  { format: '2v2', duo: 3, level: 'medium', boost: 1.1, goal: { by: 3 }, arena: 'snow', title: 'Zimní stadion', text: 'Bémič a Kiki. Pozor na Skipera a zmrzlou bránu!', reward: 'moncler' },
  { format: '1v1', opp: 'durcado', level: 'hard', boost: 1, goal: { goals: 3 }, arena: 'wind', title: 'Derby ve vichřici', text: 'Durcado hraje hlavou a fouká vítr. Musíš mu dát aspoň 3 góly.' },
  { format: '2v2', duo: 1, level: 'hard', boost: 1.05, goal: { by: 2 }, title: 'Jižní supi', text: 'Marsal a Durcado. Trojky z dálky a hlavičky – vydržíš to?' },
  { format: '1v1', opp: 'simsa', level: 'hard', boost: 1.1, goal: { by: 3 }, arena: 'moon', title: 'Semifinále na Měsíci', text: 'Šimša má VO2max 67 a na Měsíci skáče do nebe. Uteče ti?' },
  { format: '2v2', duo: 0, level: 'hard', boost: 1.12, goal: { by: 3 }, title: 'Finále ligy', text: 'Nelcis a Majda s obřím hermelínem. Poslední krok před bossem.' },
  { format: '1v1', opp: 'milan', level: 'hard', boost: 1.15, goal: { by: 5 }, title: 'BOSS: Milan Voračka', text: 'Rozhodčí odložil píšťalku a jde hrát sám. Musíš ho rozdrtit o 5 gólů!', reward: 'pav' },
];
// Odměny příběhu (náhled po klepnutí).
const STORY_REWARDS = {
  moncler: { kind: 'skin', name: 'MONCLER-JENDA', text: 'Luxusní skin pro Jendu: bílá péřová bunda, černé brýle, zlatý řetěz a bílé tenisky. Zapneš ho, když hraješ za Jendu.' },
  truegold: { kind: 'skin', name: 'TRUE GOLD KIKI', text: 'Kiki celá ze zlata se zlatou korunkou. Bonus za 4. úroveň Příběhu – vyhraj a nedostaň žádný gól.' },
  berry: { kind: 'duo', name: 'BÉMIČ Š. & BERRY', text: 'Nová dvojice: Bémič Š. a jeho mazlíček – králík Berry s dlouhýma ušima. Odměna za 10. úroveň kampaně Točná.' },
  nikol: { kind: 'duo', name: 'NIKOL & LUĎAN', text: 'Nová dvojice: Nikol a Luďan. Odměna za 17. úroveň kampaně Točná.' },
  pav: { kind: 'duo', name: 'TLUSTEJ PÁV & SULI', text: 'Nová dvojice hráčů. Páv umí OBŘÍ PÁV (zvětší se a kdo do něj narazí, je omráčený), Suli FLASH (vyhrne triko a soupeři na 3 s ztuhnou). Do té doby mají ve výběru zámeček.' },
};
const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
function storyGoalText(g) {
  if (g.by) return `Vyhraj o ${g.by} ${plural(g.by, 'gól', 'góly', 'gólů')}`;
  if (g.clean) return 'Vyhraj a nedostaň gól';
  if (g.maxConceded !== undefined) return `Vyhraj a dostaň nejvýš ${g.maxConceded} ${plural(g.maxConceded, 'gól', 'góly', 'gólů')}`;
  if (g.goals) return `Vyhraj a dej aspoň ${g.goals} ${plural(g.goals, 'gól', 'góly', 'gólů')}`;
  return 'Vyhraj zápas';
}
// Splnil hráč podmínku? (my, opp = góly; pens = vyhrál až na penalty)
function storyGoalMet(g, my, opp, won) {
  if (!won) return false;
  if (g.by && my - opp < g.by) return false;
  if (g.clean && opp > 0) return false;
  if (g.maxConceded !== undefined && opp > g.maxConceded) return false;
  if (g.goals && my < g.goals) return false;
  return true;
}
// Soupeř úrovně je pevný (i když hraješ za stejnou postavu – klidně Tóma proti Tómovi).
function storyOpp(lv) {
  return lv.format === '2v2' ? lv.duo : lv.opp;
}
// Kampaně pod tlačítkem Příběh (Vietnam má vlastní obrazovku – hraje se s parťákem online).
const TOCNA = [
  { format: '1v1', opp: 'toma', level: 'easy', boost: 1, goal: {}, title: 'Hřiště u lesa', text: 'Vítej na Točné! Tóma tě provede prvním zápasem.' },
  { format: '1v1', opp: 'peli', level: 'easy', boost: 1.05, goal: { by: 2 }, title: 'Pole za vsí', text: 'Peli je rychlý – vyhraj o 2 góly.' },
  { format: '2v2', duo: 2, level: 'easy', boost: 1.05, goal: {}, title: 'Místní derby', text: 'Tóma a Peli spolu. Hraje se 2 na 2.' },
  { format: '1v1', opp: 'kiki', level: 'medium', boost: 1, goal: {}, arena: 'snow', title: 'Zamrzlý rybník', text: 'Kiki na ledu. Pozor, klouže to!' },
  { format: '1v1', opp: 'marsal', level: 'medium', boost: 1, goal: { goals: 2 }, title: 'Trojky u stodoly', text: 'Marsal střílí trojky. Dej mu aspoň 2 góly.' },
  { format: '2v2', duo: 3, level: 'medium', boost: 1.05, goal: {}, arena: 'wind', title: 'Vítr nad Točnou', text: 'Bémič a Kiki ve vichřici.' },
  { format: '1v1', opp: 'nelcis', level: 'medium', boost: 1.05, goal: { clean: true }, title: 'Hermelínový zápas', text: 'Nelcis zablokuje bránu hermelínem. Vyhraj a nedostaň gól.' },
  { format: '1v1', opp: 'majda', level: 'medium', boost: 1.1, goal: {}, arena: 'beach', title: 'Písečná jáma', text: 'Majda a její gumové ruce. V písku to klouže míč.' },
  { format: '2v2', duo: 0, level: 'medium', boost: 1.1, goal: { by: 2 }, title: 'Holky z Točné', text: 'Nelcis a Majda – vyhraj o 2 góly.' },
  { format: '1v1', opp: 'bemic', level: 'hard', boost: 1, goal: { by: 2 }, title: 'Bémičův dvůr', text: 'Porazíš Bémiče o 2 góly a přidá se k tobě Bémič Š. s králíkem Berry!', reward: 'berry' },
  { format: '1v1', opp: 'durcado', level: 'hard', boost: 1.05, goal: {}, arena: 'moon', title: 'Noc na Měsíci', text: 'Durcado a jeho tryskáč – na Měsíci se skáče do nebe.' },
  { format: '2v2', duo: 1, level: 'hard', boost: 1.05, goal: {}, title: 'Jižní supi na Točné', text: 'Marsal a Durcado přijeli na návštěvu.' },
  { format: '1v1', opp: 'jenda', level: 'hard', boost: 1.1, goal: { by: 2 }, title: 'JENDA PRIME', text: 'Jenda v bílém dresu. Vyhraj o 2 góly.' },
  { format: '1v1', opp: 'simsa', level: 'hard', boost: 1.1, goal: { goals: 3 }, arena: 'wind', title: 'Běh do kopce', text: 'Šimša má VO2max 67 a fouká vítr. Dej mu aspoň 3 góly.' },
  { format: '2v2', duo: 4, level: 'hard', boost: 1.12, goal: { by: 2 }, title: 'Šimša a Jenda', text: 'Nejrychlejší dvojka okolí. Vyhraj o 2 góly.' },
  { format: '1v1', opp: 'milan', level: 'hard', boost: 1.15, goal: { by: 3 }, arena: 'snow', title: 'Rozhodčí na ledě', text: 'Milan Voračka a červená karta na ledě. Vyhraj o 3 góly.' },
  { format: '2v2', duo: 5, level: 'hard', boost: 1.15, goal: { by: 2 }, title: 'Páv a Suli', text: 'Obří páv a flash. Vyhraj o 2 góly a odemkneš Nikol a Luďana!', reward: 'nikol' },
  { format: '2v2', duo: 12, level: 'hard', boost: 1.2, goal: { by: 3 }, title: 'BOSS: Velké finále na Točné', text: 'Nikol a Luďan hájí Točnou. Poraz je o 3 góly a jsi král Točné!' },
];
const CAMPAIGNS = {
  pav: { name: 'Páv & Suli', short: 'Páv & Suli', key: 'hlavouni.pribeh', levels: STORY.slice() },
  tocna: { name: 'Točná', short: 'Točná', key: 'hlavouni.tocna', levels: TOCNA },
};
const CAMPAIGN_KEY = 'hlavouni.kampan';
const Story = {
  campaign: 'pav',
  key: 'hlavouni.pribeh',
  // přepnout kampaň: STORY (pole úrovní) se naplní úrovněmi vybrané kampaně
  use(id) {
    const C = CAMPAIGNS[id] || CAMPAIGNS.pav;
    this.campaign = CAMPAIGNS[id] ? id : 'pav';
    this.key = C.key;
    STORY.length = 0;
    STORY.push(...C.levels);
    try { localStorage.setItem(CAMPAIGN_KEY, this.campaign); } catch (e) { /* nevadí */ }
  },
  doneOf(id) {
    const C = CAMPAIGNS[id];
    try {
      const o = JSON.parse(localStorage.getItem(C.key));
      return Math.max(0, Math.min(C.levels.length, Math.floor(Number(o && o.done) || 0)));
    } catch (e) {
      return 0;
    }
  },
  get() {
    try {
      const o = JSON.parse(localStorage.getItem(this.key));
      const done = Math.max(0, Math.min(STORY.length, Math.floor(Number(o && o.done) || 0)));
      return { done, char: (o && typeof o.char === 'string' && o.char) || 'jenda' };
    } catch (e) {
      return { done: 0, char: 'jenda' };
    }
  },
  save(o) {
    try { localStorage.setItem(this.key, JSON.stringify(o)); } catch (e) { /* nevadí */ }
  },
};

// naposledy vybraná kampaň
try { Story.use(localStorage.getItem(CAMPAIGN_KEY) || 'pav'); } catch (e) { Story.use('pav'); }

// Výzva Vietnam: 5 zápasů 2 v 2 proti vietnamské reprezentaci, jen s parťákem (člověk) online.
// Pro všechny se otevře 27. 11. 2026 ve 12:00 (Praha); dřív jen tajným kódem.
const VIET_OPEN = Date.UTC(2026, 10, 27, 11, 0);
const VIET_CODE = 'ae48e170';
const vietOpen = () => Date.now() >= VIET_OPEN || Unlocks.has('viet');
const VIET = [
  { duo: 6, level: 'easy', boost: 1, short: 'Hanoj', title: 'Přátelák v Hanoji', text: 'První zápas proti vietnamské reprezentaci. Rozehrajte se!' },
  { duo: 7, level: 'medium', boost: 1, arena: 'wind', short: 'Monzun', title: 'Monzun', text: 'Fouká monzun – hlídejte šipku větru.' },
  { duo: 8, level: 'medium', boost: 1.1, arena: 'beach', short: 'Nha Trang', title: 'Pláž v Nha Trangu', text: 'Písek zpomaluje nohy i míč.' },
  { duo: 9, level: 'hard', boost: 1.05, short: 'Semifinále', title: 'Semifinále v Ho Či Minově Městě', text: 'Teď už jde do tuhého.' },
  { duo: 10, level: 'hard', boost: 1.15, short: 'Finále', title: 'Finále proti kapitánům', text: 'Porazte kapitány a odemkne se Tráňa!', reward: 'trana' },
];
const VIET_KEY = 'hlavouni.vietnam';
const Viet = {
  done() {
    try { return Math.max(0, Math.min(VIET.length, Math.floor(Number(localStorage.getItem(VIET_KEY)) || 0))); } catch (e) { return 0; }
  },
  // další zápas (po dohrání všech se hraje finále znovu)
  next() {
    return Math.min(this.done(), VIET.length - 1);
  },
  // po zápase: postup a odměna (vrací true, když se právě odemkl Tráňa)
  record(win, level) {
    if (!win) return false;
    try { localStorage.setItem(VIET_KEY, String(Math.max(this.done(), level))); } catch (e) { /* nevadí */ }
    const rw = VIET[level - 1] && VIET[level - 1].reward;
    if (rw && !Unlocks.has(rw)) {
      Unlocks.set(rw);
      return true;
    }
    return false;
  },
};

// Sponzoři (tabule kolem hřiště, velká obrazovka, menu).
const SPONSORS = [
  { t: 'HOT PEPPERS', bg: '#1b0f0c', fg: '#ff5a2a', icon: 'chili' },
  { t: 'RADEGAST', bg: '#14532d', fg: '#ffffff', icon: 'star' },
];

// Poháry za zápas podle obtížnosti: výhra, max. bonus (za rozdíl skóre i za vlastní góly),
// prohra a bonus za vyhraný turnaj. Lehký počítač dává málo a za prohru s ním se hodně ztrácí.
const TROPHY_RULES = {
  easy: { name: 'lehký', win: 3, bonus: 1, lose: 4, cup: 5 },
  medium: { name: 'střední', win: 8, bonus: 2, lose: 3, cup: 15 },
  hard: { name: 'těžký', win: 14, bonus: 4, lose: 1, cup: 30 },
  online: { name: 'online', win: 10, bonus: 3, lose: 3, cup: 20 },
};

// Poháry a ligy (postup se ukládá v zařízení).
const RANKS = [
  { name: 'Nováček', min: 0, color: '#9fb0c7' },
  { name: 'Bronz', min: 40, color: '#d98b4a' },
  { name: 'Stříbro', min: 120, color: '#cfd8e6' },
  { name: 'Zlato', min: 250, color: '#ffc93c' },
  { name: 'Diamant', min: 450, color: '#53d2ff' },
  { name: 'Mistr', min: 700, color: '#b07bff' },
  { name: 'Legenda', min: 1000, color: '#ff5fb0' },
];
function rankOf(trophies) {
  let i = 0;
  while (i + 1 < RANKS.length && trophies >= RANKS[i + 1].min) i++;
  const r = RANKS[i], next = RANKS[i + 1] || null;
  const prog = next ? (trophies - r.min) / (next.min - r.min) : 1;
  return { i, rank: r, next, prog: clamp(prog, 0, 1) };
}

// Opakovatelný náhodný výběr (stejný u hostitele i u kamarádů).
function seedOf(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SUPER_COLORS = {
  nelcis: '#ff5fb0', majda: '#e86bff', marsal: '#3fa2ff', durcado: '#4fe0c0', toma: '#5fe36b',
  peli: '#b07bff', bemic: '#ff7a1f', kiki: '#53d2ff', simsa: '#c6ff3d', jenda: '#ff4d4d', milan: '#ff2d2d', pav: '#14b8a6', sully: '#7ee8d8', trana: '#ff8a5b',
};
const superColor = (id) => SUPER_COLORS[id] || '#ffc93c';

// Superschopnosti postav (ostatní mají superstřelu).
//  cheese  – v bráně jejich týmu se objeví obří hermelín a na 3 s ji zablokuje
//  vo2     – „MÁM VO2max 67“: 5 s běhá 2× rychleji
//  basket  – „STŘÍLIM TY TROJKY“: míč se změní v basketbalový a letí obloukem přes obránce do koše nad bránou
//  penguin – na 3 s se promění v tučňáka a jejich brána zamrzne
const POWERS = {
  shot: { name: 'Superstřela', short: 'Super', icon: '⚡', desc: 'Dělová rána s ohněm, odstřelí soupeře' },
  cheese: { name: 'Obří hermelín', short: 'Hermelín', icon: '🧀', desc: 'Na 3 s zablokuje vaši bránu' },
  vo2: { name: 'VO2max 67', short: 'VO2max', icon: '💨', desc: '5 s běhá 2× rychleji' },
  prime: { name: 'JENDA PRIME', short: 'Prime', icon: '⭐', desc: '5 s v bílém dresu Realu Madrid: rychlejší, silnější, skáče výš' },
  sushi: { name: 'Obří sushi', short: 'Sushi', icon: '🍣', desc: 'Pod Tráňou vyroste obří sushi, balancuje na něm, jede dopředu a omráčí každého, koho srazí' },
  arms: { name: 'Gumové ruce', short: 'Ruce', icon: '🤲', desc: 'Ruce se natáhnou přes půl hřiště a přitáhnou míč k nohám – i z trojky nebo z tryskáče' },
  jet: { name: 'Byznysman', short: 'Tryskáč', icon: '🛩️', desc: 'V obleku nastoupí do soukromého tryskáče s míčem a shodí ho soupeři přímo před bránu' },
  grow: { name: 'Obří páv', short: 'Obr', icon: '🦚', desc: 'Na 3 s se zvětší a ztloustne, kdo do něj narazí, je omráčený' },
  flash: { name: 'Flash', short: 'Flash', icon: '😳', desc: 'Vyhrne triko a soupeři na 3 s ztuhnou s vyvalenýma očima' },
  redcard: { name: 'Červená karta', short: 'Karta', icon: '🟥', desc: 'Soupeři na 2 s ztuhnou' },
  basket: { name: 'Trojka', short: 'Trojka', icon: '🏀', desc: 'U míče: míč se změní v basketbalový a letí obloukem do brány soupeře' },
  penguin: { name: 'Skiper', short: 'Skiper', icon: '🐧', desc: 'Promění se v tučňáka, brána zamrzne na 3 s' },
};
const CHAR_POWER = { nelcis: 'cheese', simsa: 'vo2', bemic: 'penguin', marsal: 'basket', jenda: 'prime', milan: 'redcard', pav: 'grow', sully: 'flash', durcado: 'jet', majda: 'arms', trana: 'sushi' };
const SUSHI_TIME = 2.6;  // jak dlouho Tráňa jede na sushi (s)
const SUSHI_SPEED = 640; // rychlost jízdy
const SUSHI_H = 44;      // výška sushi pod nohama
const ARM_REACH = 760; // dosah gumových rukou (px)
const JET_LEN = 3.3;  // jak dlouho je tryskáč na scéně (s)
const SUIT_TIME = 6;  // Durcado v obleku (s)
// shoz míče před bránou soupeře: vzdálenost od brankové čáry a rychlost míče
const JET_DROP = { off: 80, vx: 520, vy: 420 };
// oblek byznysmana (tmavomodrý, bílá košile, červená kravata)
const SUIT_KIT = { name: 'BYZNYSMAN', short: 'Byznysman', color: '#1d2a44', dark: '#121a2c', light: '#e9edf3', num: '#e9edf3' };
const GROW_TIME = 3;   // Obří páv
const GROW_K = 1.35;   // o kolik se zvětší
const GROW_STUN = 1.6; // omráčení po nárazu
const FLASH_TIME = 3;  // Selfie flash: soupeři ztuhnou
const REDCARD_TIME = 2;
// JENDA PRIME: na 5 s hráč Realu Madrid
const PRIME_TIME = 5;
const PRIME_SPEED = 1.5; // rychlost běhu
const PRIME_JUMP = 1.3;  // výskok
const PRIME_KICK = 1.4;  // síla kopu
// bílý dres se zlatým a tmavomodrým lemováním (bez znaku klubu)
const PRIME_KIT = { name: 'JENDA PRIME', short: 'Jenda Prime', color: '#f8f8f5', dark: '#d9dde6', light: '#c9a227', num: '#1d2b5c' };
const powerOf = (id) => CHAR_POWER[id] || 'shot';
const BLOCK_TIME = 3;    // jak dlouho hermelín / led blokuje bránu
const BOOST_TIME = 5;    // VO2max
const BOOST_MUL = 2;
const BASKET_REACH = 170; // jak blízko musí být Marsal u míče
const BASKET_Y = BAR_Y - 64; // výška koše nad bránou
const HALF_LEN = 45;      // poločas trvá 45 s (na hodinách 45 minut)

// Fotbalové hodiny: 1 s hry = 1 minuta na hodinách.
function fbClock(sec) {
  const m = Math.floor(sec), s = Math.floor((sec - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Rozhodčí (nehraje, objeví se v úvodu a o poločase).
const REFEREE = {
  id: 'referee', name: 'Milan Voračka', num: '', ref: true, skin: '#f1c2a0', hair: 'receding', hairColor: '#c9a66a',
  hairDark: '#8a6a34', hairLight: '#ecd39c', eyes: '#86a0b4', brow: '#a8895a', lid: 0.24, browW: 3.4, mouth: 'flat', stubble: true,
};
const REF_T = { name: 'ROZHODČÍ', short: 'Rozhodčí', color: '#25282f', dark: '#121419', light: '#ffd23f' };
const PENGUIN_TIME = 3;
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
const easeInQuad = (t) => t * t;
const easeOutBounce = (t) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};
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
