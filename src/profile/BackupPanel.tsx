import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { palette } from "../design";
import { backupSummary, parseBackup, MAX_BACKUP_BYTES } from "./backup";

type Props = {
  createBackup: () => Promise<string>;
  restoreBackup: (raw: string) => Promise<void>;
  ready: boolean;
};
type Selected = { name: string; raw: string };
function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Operaci se nepodařilo dokončit. Zkus to znovu.";
}
async function pickWebFile(): Promise<Selected | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json,text/plain";
    input.style.display = "none";
    let settled = false,
      timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: Selected | null, error?: unknown) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", focus);
      input.remove();
      if (error) reject(error);
      else resolve(result);
    };
    const focus = () => {
      timer = setTimeout(() => {
        if (!input.files?.length) finish(null);
      }, 500);
    };
    input.oncancel = () => finish(null);
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      if (file.size > MAX_BACKUP_BYTES) {
        finish(null, new Error("Soubor je větší než povolených 8 MB."));
        return;
      }
      try {
        finish({ name: file.name, raw: await file.text() });
      } catch (error) {
        finish(null, error);
      }
    };
    document.body.appendChild(input);
    window.addEventListener("focus", focus);
    input.click();
  });
}
async function pickFile(): Promise<Selected | null> {
  if (Platform.OS === "web") return pickWebFile();
  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const file = result.assets[0];
  if (!file || (file.size !== undefined && file.size > MAX_BACKUP_BYTES))
    throw new Error("Soubor je větší než povolených 8 MB.");
  const info = await FileSystem.getInfoAsync(file.uri);
  if (!info.exists || info.isDirectory || info.size > MAX_BACKUP_BYTES)
    throw new Error("Soubor nelze přečíst nebo je větší než 8 MB.");
  const raw = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return { name: file.name, raw };
}
async function saveFile(raw: string) {
  const backup = parseBackup(raw),
    date = new Date(backup.exportedAt).toISOString().replace(/[:.]/g, "-");
  const filename = `quitter-backup-${date}.json`;
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(
        new Blob([raw], { type: "application/json;charset=utf-8" }),
      ),
      link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync()))
    throw new Error(
      "Sdílení souborů není v tomto prostředí dostupné. Zkus zálohu uložit z nativní aplikace na telefonu.",
    );
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, raw, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(uri, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "Uložit zálohu Quitteru",
  });
}
function Action({
  children,
  onPress,
  quiet = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  quiet?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        quiet ? s.quiet : null,
        disabled ? { opacity: 0.35 } : null,
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <Text style={[s.buttonText, quiet ? { color: palette.Me } : null]}>
        {children}
      </Text>
    </Pressable>
  );
}
export function BackupPanel({ createBackup, restoreBackup, ready }: Props) {
  const [selected, setSelected] = useState<Selected | null>(null),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState<"pick" | "export" | "restore" | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const summary = useMemo(
    () => (selected ? backupSummary(parseBackup(selected.raw)) : null),
    [selected],
  );
  async function exportCurrent() {
    setBusy("export");
    setError("");
    setNotice("");
    try {
      await saveFile(await createBackup());
      setNotice(
        Platform.OS === "web"
          ? "Stažení zálohy bylo předáno prohlížeči."
          : "Záloha byla předána do nabídky sdílení. Dokonči její uložení ve zvolené aplikaci.",
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(null);
    }
  }
  async function choose() {
    setBusy("pick");
    setError("");
    setNotice("");
    try {
      const file = await pickFile();
      if (file) {
        parseBackup(file.raw);
        setSelected(file);
        setConfirm(false);
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(null);
    }
  }
  async function restore() {
    if (!selected) return;
    setBusy("restore");
    setError("");
    setNotice("");
    try {
      await restoreBackup(selected.raw);
      setSelected(null);
      setConfirm(false);
      setNotice("Záloha byla obnovena. Přehledy se načtou z obnovených dat.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(null);
    }
  }
  return (
    <View style={s.body}>
      <Text style={s.label}>TVÁ DATA / POD TVOU KONTROLOU</Text>
      <Text style={s.title}>Vezmi svůj postup s sebou.</Text>
      <Text style={s.text}>
        Jeden JSON soubor pro Quit, Build, Mind, Business a profil. Obnovíš jej
        i na jiném zařízení s touto verzí aplikace.
      </Text>
      <View style={s.section}>
        <Text style={s.h2}>Uložit zálohu</Text>
        <Text style={s.muted}>
          Soubor obsahuje osobní záznamy, poznámky a tvoje důvody. Ulož ho na
          místo, kterému důvěřuješ. Není zašifrovaný.
        </Text>
        <Action
          disabled={!ready || !!busy}
          onPress={() => void exportCurrent()}
        >
          {busy === "export"
            ? "Připravuji zálohu…"
            : "Stáhnout nebo sdílet zálohu"}
        </Action>
        {!ready && (
          <Text style={s.muted}>
            Export bude dostupný po načtení a uložení všech dat. Platnou zálohu
            můžeš načíst i pro opravu poškozeného úložiště.
          </Text>
        )}
      </View>
      <View style={s.section}>
        <Text style={s.h2}>Obnovit ze souboru</Text>
        <Text style={s.muted}>
          Nejdřív uvidíš datum a obsah. Samotný výběr souboru v aplikaci nic
          nemění. Maximální velikost je 8 MB.
        </Text>
        <Action quiet disabled={!!busy} onPress={() => void choose()}>
          {busy === "pick"
            ? "Načítám soubor…"
            : selected
              ? "Vybrat jiný soubor"
              : "Vybrat zálohu JSON"}
        </Action>
      </View>
      {selected && summary && (
        <View style={s.preview}>
          <Text style={s.label}>ZKONTROLOVANÝ SOUBOR</Text>
          <Text style={s.h2}>{selected.name}</Text>
          <Text style={s.muted}>
            Vytvořeno {new Date(summary.exportedAt).toLocaleString("cs-CZ")}
          </Text>
          {[
            ["Quit", `Programy: ${summary.programs}`],
            [
              "Build",
              `Tréninky: ${summary.workouts} · aktivity: ${summary.activities}`,
            ],
            [
              "Mind",
              `Splnění: ${summary.mindActivities} · kola: ${summary.games} · lekce: ${summary.lessons}`,
            ],
            [
              "Business",
              `Projekty: ${summary.projects} · kroky: ${summary.tasks}`,
            ],
            [
              "Profil",
              summary.hasProfile
                ? summary.name || "Bez vyplněného jména"
                : "V záloze není uložený",
            ],
          ].map(([label, value]) => (
            <View key={label} style={s.row}>
              <Text style={s.rowLabel}>{label}</Text>
              <Text style={s.rowValue}>{value}</Text>
            </View>
          ))}
          <Text style={s.muted}>
            Obnova nahradí všech pět oblastí tímto snímkem. Oblasti, které v něm
            nejsou uložené, se vrátí do výchozího stavu. Data se neslučují.
          </Text>
          <Action
            quiet
            disabled={!ready || !!busy}
            onPress={() => void exportCurrent()}
          >
            Nejdřív uložit současnou zálohu
          </Action>
          {!confirm ? (
            <Action
              disabled={!!busy}
              onPress={() => {
                setConfirm(true);
                setError("");
              }}
            >
              Pokračovat k obnově
            </Action>
          ) : (
            <View style={s.confirm}>
              <Text style={s.h2}>Nahradit současná data?</Text>
              <Text style={s.text}>
                Použije se soubor „{selected.name}“. Před obnovou aplikace uloží
                záchranný snímek pro případ přerušení zápisu.
              </Text>
              <Action disabled={!!busy} onPress={() => void restore()}>
                {busy === "restore"
                  ? "Obnovuji data…"
                  : "Potvrdit nahrazení dat"}
              </Action>
              <Action quiet disabled={!!busy} onPress={() => setConfirm(false)}>
                Vrátit se ke kontrole
              </Action>
            </View>
          )}
        </View>
      )}
      {busy && (
        <View style={s.busy}>
          <ActivityIndicator color={palette.Me} />
          <Text accessibilityLiveRegion="polite" style={s.muted}>
            {busy === "restore"
              ? "Počkej na dokončení obnovy."
              : "Pracuji se souborem…"}
          </Text>
        </View>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : null}
      {notice ? (
        <Text accessibilityLiveRegion="polite" style={s.notice}>
          {notice}
        </Text>
      ) : null}
    </View>
  );
}
const s = StyleSheet.create({
  body: { gap: 22 },
  title: {
    fontSize: 34,
    fontWeight: "600",
    letterSpacing: -1.2,
    lineHeight: 39,
    color: "#f4f6ff",
  },
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600",
    letterSpacing: -0.3,
    color: "#edf2ff",
  },
  label: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.7,
    color: palette.Me,
  },
  text: { fontSize: 15, lineHeight: 24, color: "#d8dfed" },
  muted: { fontSize: 13, lineHeight: 21, color: "#94a2b8" },
  section: {
    gap: 14,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: "#ffffff15",
  },
  preview: {
    gap: 18,
    paddingTop: 24,
    borderTopWidth: 1,
    borderColor: `${palette.Me}55`,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff0c",
    paddingBottom: 12,
  },
  rowLabel: { width: 62, color: "#edf2ff", fontSize: 13, fontWeight: "600" },
  rowValue: { flex: 1, fontSize: 13, lineHeight: 20, color: "#a7b3c7" },
  confirm: {
    gap: 16,
    paddingTop: 22,
    borderTopWidth: 1,
    borderColor: `${palette.Me}55`,
  },
  button: {
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 9,
    backgroundColor: palette.Me,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    color: "#11141c",
  },
  quiet: {
    borderRadius: 0,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderColor: "#ffffff18",
  },
  busy: { flexDirection: "row", alignItems: "center", gap: 10 },
  error: { fontSize: 13, lineHeight: 21, color: "#ffb3c0" },
  notice: { fontSize: 13, lineHeight: 21, color: "#62edbc" },
});
