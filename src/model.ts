export const ranks = ['Copper', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Sapphire', 'Ruby', 'Emerald', 'Diamond', 'Obsidian'] as const;
export const milestones = [0, 3, 5, 9, 14, 21, 30, 60, 90, 180];
export type ProgramId = 'porn' | 'scroll' | 'food';
export type Program = { startedAt: number; reasons: string; signature: string; prime: number; limit: number; target: string; days: Record<string, boolean>; history: { at: number; duration: number }[] };
export type Data = Partial<Record<ProgramId, Program>>;
export function dayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function streak(p: Program, now = Date.now()) {
  let days = 0;
  const date = new Date(now); date.setDate(date.getDate() - 1);
  while (p.days[dayKey(date)] === true) { days++; date.setDate(date.getDate() - 1); }
  return days;
}
export function rankForDays(days: number) { return milestones.reduce((rank, threshold, index) => days >= threshold ? index : rank, 0); }
export function rankOf(id: ProgramId, p: Program, now = Date.now()) { return rankForDays(id === 'porn' ? Math.max(0, (now - p.startedAt) / 86400000) : streak(p, now)); }
export const definitions = {
  porn: { title: 'Porn Reboot', label: 'PŘEVEZMI KONTROLU', color: '#b994ff', symbol: '◎', description: 'Vědomé sledování porna přerušuje sérii. Masturbace bez porna ani náhodné zobrazení obsahu ji neruší.', target: 'Bez vědomého sledování porna', prompt: 'Co chceš získat zpět?', action: 'Odlož telefon a přesuň se na jiné místo. Dej si dvě minuty chůze nebo klidného dýchání.' },
  scroll: { title: 'Doomscrolling', label: 'TVŮJ ČAS. TVOJE VOLBA.', color: '#c5fa67', symbol: '↯', description: 'Zvol aplikace a společný denní limit. Série roste za dokončené dny, kdy svůj limit dodržíš.', target: 'Instagram, TikTok, YouTube', prompt: 'Čemu chceš věnovat svůj čas?', action: 'Polož telefon displejem dolů. Vyber jednu věc mimo obrazovku a věnuj jí příštích pět minut.' },
  food: { title: 'Junk Food', label: 'VĚDOMÁ VOLBA', color: '#ffbd7a', symbol: '◈', description: 'Nastav konkrétní pravidlo. Cílem není hladovění ani trestání, ale omezení návyku, který ti nevyhovuje.', target: 'Bez sladkých nápojů', prompt: 'Proč chceš změnit tento návyk?', action: 'Zastav se: máš hlad, nebo reaguješ na stres? Pokud máš hlad, dej si běžné syté jídlo. Jinak si dopřej krátkou pauzu.' },
};
