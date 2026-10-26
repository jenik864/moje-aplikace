import {
  BACKUP_KEYS,
  createBackup,
  parseBackup,
  validatePayload,
  assertExactKeys,
  object,
  time,
  utf8Bytes,
  type BackupPayload,
} from "./backup.ts";
export const JOURNAL_KEY = "quitter.restore-journal.v1";
const MAX_JOURNAL_BYTES = 32 * 1024 * 1024;
export type BackupStorage = {
  getItem: (key: string) => Promise<string | null>;
  multiGet: (
    keys: readonly string[],
  ) => Promise<readonly (readonly [string, string | null])[]>;
  multiSet: (pairs: ReadonlyArray<readonly [string, string]>) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};
type Journal = {
  format: "quitter-restore-journal";
  version: 1;
  createdAt: number;
  before: BackupPayload;
};
export class BackupStorageError extends Error {
  readonly recoveryRequired: boolean;
  constructor(message: string, recoveryRequired = false) {
    super(message);
    this.name = "BackupStorageError";
    this.recoveryRequired = recoveryRequired;
  }
}
const queues = new WeakMap<BackupStorage, Promise<unknown>>();
function exclusive<T>(
  storage: BackupStorage,
  operation: () => Promise<T>,
): Promise<T> {
  const prior = queues.get(storage) ?? Promise.resolve();
  const next = prior.catch(() => {}).then(operation);
  queues.set(
    storage,
    next.catch(() => {}),
  );
  return next;
}
async function snapshot(storage: BackupStorage): Promise<BackupPayload> {
  const pairs = await storage.multiGet(BACKUP_KEYS);
  if (
    pairs.length !== BACKUP_KEYS.length ||
    pairs.some(
      (pair) =>
        !Array.isArray(pair) ||
        pair.length !== 2 ||
        !BACKUP_KEYS.includes(pair[0] as any),
    ) ||
    new Set(pairs.map((p) => p[0])).size !== BACKUP_KEYS.length
  )
    throw new BackupStorageError(
      "Úložiště nevrátilo úplný snímek dat. Nic se nezměnilo.",
    );
  return validatePayload(Object.fromEntries(pairs), false);
}
function parseJournal(raw: string): Journal {
  if (utf8Bytes(raw) > MAX_JOURNAL_BYTES)
    throw new BackupStorageError(
      "Záznam přerušené obnovy nelze bezpečně přečíst. Původní data jsme ponechali.",
      true,
    );
  try {
    const j: unknown = JSON.parse(raw);
    assertExactKeys(j, ["format", "version", "createdAt", "before"]);
    if (
      !object(j) ||
      j.format !== "quitter-restore-journal" ||
      j.version !== 1 ||
      !time(j.createdAt)
    )
      throw new Error("journal");
    return { ...j, before: validatePayload(j.before, false) } as Journal;
  } catch {
    throw new BackupStorageError(
      "Záznam přerušené obnovy je neplatný. Data jsme nepřepsali.",
      true,
    );
  }
}
async function apply(storage: BackupStorage, payload: BackupPayload) {
  const set = BACKUP_KEYS.filter((k) => payload[k] !== null).map(
    (k) => [k, payload[k]!] as const,
  );
  if (set.length) await storage.multiSet(set);
  for (const key of BACKUP_KEYS)
    if (payload[key] === null) await storage.removeItem(key);
}
async function verify(storage: BackupStorage, payload: BackupPayload) {
  const actual = await snapshot(storage);
  if (BACKUP_KEYS.some((k) => actual[k] !== payload[k]))
    throw new Error("Zapsaná data nelze ověřit.");
}
async function clearJournal(storage: BackupStorage) {
  await storage.removeItem(JOURNAL_KEY);
  if ((await storage.getItem(JOURNAL_KEY)) !== null)
    throw new Error("Záznam obnovy se nepodařilo uzavřít.");
}
async function recover(storage: BackupStorage): Promise<boolean> {
  const raw = await storage.getItem(JOURNAL_KEY);
  if (raw === null) return false;
  const journal = parseJournal(raw);
  try {
    // The original values may themselves be corrupt. Restoring their exact bytes
    // is necessary to make rollback reversible; never repair or reset them here.
    await apply(storage, journal.before);
    await verify(storage, journal.before);
    await clearJournal(storage);
    return true;
  } catch {
    throw new BackupStorageError(
      "Obnovu se nepodařilo bezpečně vrátit. Zavři ostatní změny a zkus obnovu úložiště znovu. Záchranný záznam zůstává uložený.",
      true,
    );
  }
}
export function recoverBackup(storage: BackupStorage): Promise<boolean> {
  return exclusive(storage, () => recover(storage));
}
export function readBackup(storage: BackupStorage): Promise<string> {
  return exclusive(storage, async () => {
    await recover(storage);
    return createBackup(await snapshot(storage));
  });
}
export function restoreBackup(
  storage: BackupStorage,
  raw: string,
): Promise<void> {
  // Parsing and domain validation precede all reads or writes, including recovery.
  let payload: BackupPayload;
  try {
    payload = parseBackup(raw).payload;
  } catch (error) {
    return Promise.reject(error);
  }
  return exclusive(storage, async () => {
    await recover(storage);
    const before = await snapshot(storage);
    const journal: Journal = {
      format: "quitter-restore-journal",
      version: 1,
      createdAt: Date.now(),
      before,
    };
    const journalRaw = JSON.stringify(journal);
    if (utf8Bytes(journalRaw) > MAX_JOURNAL_BYTES)
      throw new BackupStorageError(
        "Současná data jsou příliš velká pro bezpečný záchranný záznam. Nic se nezměnilo.",
      );
    try {
      await storage.multiSet([[JOURNAL_KEY, journalRaw]]);
      if ((await storage.getItem(JOURNAL_KEY)) !== journalRaw)
        throw new Error("Záchranný záznam nelze ověřit.");
    } catch {
      // No application keys have been changed yet. A possibly persisted journal
      // is safe to recover later, even if a storage provider rejected after writing.
      throw new BackupStorageError(
        "Nepodařilo se připravit bezpečnou obnovu. Data jsme nezačali měnit; zkus úložiště znovu.",
        true,
      );
    }
    try {
      await apply(storage, payload);
      await verify(storage, payload);
    } catch {
      try {
        await recover(storage);
      } catch {
        throw new BackupStorageError(
          "Obnova se nedokončila a návrat původních dat čeká na obnovení úložiště. Záchranný záznam zůstává uložený.",
          true,
        );
      }
      throw new BackupStorageError(
        "Obnova se nepodařila. Původní data byla vrácena; vybraný soubor můžeš zkusit znovu.",
      );
    }
    // Removing the durable journal is the commit point. If a provider throws
    // after deletion, inspect the key before deciding whether rollback is safe.
    try {
      await clearJournal(storage);
    } catch {
      let remaining: string | null;
      try {
        remaining = await storage.getItem(JOURNAL_KEY);
      } catch {
        throw new BackupStorageError(
          "Zápis je ověřený, ale uzavření obnovy nelze potvrdit. Neprováděj další změny a zkus úložiště znovu.",
          true,
        );
      }
      if (remaining === null) return; // deletion completed despite a rejected promise
      if (remaining !== journalRaw)
        throw new BackupStorageError(
          "Záchranný záznam se během obnovy změnil. Další změny jsou pozastavené do kontroly úložiště.",
          true,
        );
      try {
        await recover(storage);
      } catch {
        throw new BackupStorageError(
          "Obnova čeká na bezpečné vrácení původních dat. Záchranný záznam zůstává uložený.",
          true,
        );
      }
      throw new BackupStorageError(
        "Obnovu nešlo bezpečně uzavřít. Původní data byla vrácena; zkus to znovu.",
      );
    }
  });
}
