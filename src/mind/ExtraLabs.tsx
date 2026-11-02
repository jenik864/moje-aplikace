import React, { useContext, useState } from "react";
import { View, Text } from "react-native";
import { Button, Chip, MindTheme, mint, useMindStyles } from "./components";
import {
  binaryTrace,
  discountedPrice,
  energyKWh,
  filterExample,
  transferSeconds,
} from "./experiments";
export function ExtraLabs({ id, step }: { id: string; step: number }) {
  const s = useMindStyles(),
    color = useContext(MindTheme);
  const [value, setValue] = useState(0),
    [index, setIndex] = useState(0),
    [hidden, setHidden] = useState(false);
  let title = "",
    content: React.ReactNode,
    note = "";
  const options = (labels: string[]) => (
    <View style={s.wrap}>
      {labels.map((label, i) => (
        <Chip
          key={label}
          label={label}
          selected={value === i}
          onPress={() => {
            setValue(i);
            setIndex(0);
          }}
        />
      ))}
    </View>
  );
  const number = (text: string) => (
    <Text accessibilityLiveRegion="polite" style={[s.stat, { color: mint }]}>
      {text}
    </Text>
  );
  if (id === "percentages") {
    title =
      step === 0
        ? "ZKUS JINOU SLEVU"
        : step === 1
          ? "DVA KROKY / NOVÝ ZÁKLAD"
          : "BODY A RELATIVNÍ ZMĚNA";
    const discount = [10, 20, 30][value],
      end = [25, 30, 40][value];
    content =
      step === 0 ? (
        <>
          {options(["10 %", "20 %", "30 %"])}
          {number(
            `${discountedPrice(800, [discount]).toLocaleString("cs-CZ")} Kč`,
          )}
          <Text style={s.text}>
            Z původních 800 Kč. Sleva je {(800 * discount) / 100} Kč.
          </Text>
        </>
      ) : step === 1 ? (
        <>
          {options(["+10 %, −10 %", "+20 %, −20 %", "+30 %, −30 %"])}
          {number(
            `${discountedPrice(1000, [-discount, discount]).toLocaleString("cs-CZ")} Kč`,
          )}
          <Text style={s.text}>
            1 000 → {1000 * (1 + discount / 100)} →{" "}
            {discountedPrice(1000, [-discount, discount]).toLocaleString(
              "cs-CZ",
            )}{" "}
            Kč
          </Text>
        </>
      ) : (
        <>
          {options(["20 → 25 %", "20 → 30 %", "20 → 40 %"])}
          {number(`+${end - 20} procentních bodů`)}
          <Text style={s.text}>
            Relativní růst: +{((end - 20) / 20) * 100} %. Výchozí podíl byl 20
            %.
          </Text>
        </>
      );
  } else if (id === "internet") {
    title =
      step === 0
        ? "CESTA JEDNOHO POŽADAVKU"
        : step === 1
          ? "MB A Mb/s"
          : "CO ZÁMEK NEPOTVRZUJE";
    content =
      step === 0 ? (
        <>
          {options(["1 · DNS", "2 · Spojení", "3 · Odpověď"])}
          <View style={s.wrap}>
            {["Doména", "Adresa", "Server", "Stránka"].map((v, i) => (
              <View
                key={v}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: i === value + 1 ? `${color}30` : "#ffffff08",
                }}
              >
                <Text
                  style={[
                    s.text,
                    { color: i === value + 1 ? color : "#a0a0a0" },
                  ]}
                >
                  {v}
                </Text>
              </View>
            ))}
          </View>
          <Text accessibilityLiveRegion="polite" style={s.text}>
            {
              [
                "DNS vrátí adresu pro hledanou doménu. Pokud ji znáš z mezipaměti, dotaz se může vynechat.",
                "Klient naváže spojení; pro HTTPS proběhne také ověření certifikátu a vyjednání ochrany přenosu.",
                "Server vrátí odpověď a prohlížeč zpracuje HTML i další potřebné soubory.",
              ][value]
            }
          </Text>
        </>
      ) : step === 1 ? (
        <>
          {options(["10 Mb/s", "20 Mb/s", "40 Mb/s"])}
          {number(`${transferSeconds(10, [10, 20, 40][value])} s`)}
          <Text style={s.text}>
            10 MB = 80 Mb. Model bez režie, čekání a kolísání rychlosti.
          </Text>
        </>
      ) : (
        <>
          {options(["Spojení", "Obsah", "Obchodník"])}
          {number(value === 0 ? "Chráněný přenos" : "Samostatné ověření")}
          <Text style={s.text}>
            {
              [
                "TLS chrání data při přenosu a ověřuje certifikát pro doménu.",
                "Pravdivost článku ověř z jeho podkladů a dalších zdrojů.",
                "Ani platný certifikát nezaručí, že prodejce dodrží svůj slib.",
              ][value]
            }
          </Text>
        </>
      );
  } else if (id === "memory") {
    title =
      step === 0
        ? "VYBAV SI BEZ NÁPOVĚDY"
        : step === 1
          ? "ROZLOŽ PRAXI DO ČASU"
          : "STEJNÁ DATA / JINÁ STRUKTURA";
    content =
      step === 0 ? (
        <>
          <Text style={s.text}>
            {hidden
              ? "Zkus si vybavit pět slov. Až skončíš, odkryj je a ověř si výsledek."
              : "ŘEKA · KLÍČ · MRKEV · MRAK · KOLO"}
          </Text>
          <Button quiet onPress={() => setHidden(!hidden)}>
            {hidden ? "Odkryj a ověř" : "Skrýt slova"}
          </Button>
          <Text style={s.muted}>
            Malé cvičení pro tebe. Výsledek se neodhaduje a nepřidává XP.
          </Text>
        </>
      ) : step === 1 ? (
        <>
          {options(["Jednou", "Rozloženě"])}
          <View style={s.wrap}>
            {(value === 0
              ? ["Dnes · 30 min"]
              : ["Dnes · 10 min", "Zítra · 10 min", "Za 4 dny · 10 min"]
            ).map((v) => (
              <View
                key={v}
                style={{
                  backgroundColor: `${color}20`,
                  padding: 12,
                  borderRadius: 12,
                }}
              >
                <Text style={s.text}>{v}</Text>
              </View>
            ))}
          </View>
          <Text style={s.muted}>
            Oba příklady mají 30 minut. Rozestupy uprav podle obtížnosti a
            vybavení.
          </Text>
        </>
      ) : (
        <>
          {options(["Bez členění", "Tři skupiny"])}
          {number(value === 0 ? "739162845" : "739 · 162 · 845")}
          <Text style={s.text}>
            Počet číslic je stejný. Přepni členění a vyzkoušej, která podoba se
            ti lépe čte.
          </Text>
        </>
      );
  } else if (id === "critical-thinking") {
    title =
      step === 0
        ? "HLEDEJ DALŠÍ VYSVĚTLENÍ"
        : step === 1
          ? "ZMĚŇ ČETNOST PODVODŮ"
          : "ROZBAL TVRZENÍ";
    const result = filterExample([1, 10, 50][value]);
    content =
      step === 0 ? (
        <>
          {options(["Pozorování", "Společný vliv"])}
          <Text style={[s.h2, { color: mint }]}>
            {value === 0 ? "Zmrzlina ↔ koupaliště" : "Teplé počasí"}
          </Text>
          <Text style={s.text}>
            {value === 0
              ? "Prodej i návštěvnost rostou současně. Tato informace sama neurčuje příčinu."
              : "Počasí může ovlivňovat obě veličiny. Souvislost není důkaz, že zmrzlina způsobuje návštěvu koupaliště."}
          </Text>
        </>
      ) : step === 1 ? (
        <>
          {options(["1 % podvodů", "10 % podvodů", "50 % podvodů"])}
          {number(
            `${result.share.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} %`,
          )}
          <Text style={s.text}>Skutečné podvody mezi označenými.</Text>
          <Text style={s.muted}>
            Z 10 000 zpráv: {result.detected.toLocaleString("cs-CZ")} odhalených
            podvodů a {result.falseAlarms.toLocaleString("cs-CZ")} falešných
            poplachů. Citlivost 95 %, falešné označení 5 %.
          </Text>
        </>
      ) : (
        <>
          {options(["Vzorek", "Srovnání", "Měření"])}
          <Text accessibilityLiveRegion="polite" style={s.text}>
            {
              [
                "Koho se ptali? Jen spokojených zákazníků, nebo i těch, kteří odešli?",
                "Oproti čemu nastalo zlepšení? Co se ve stejné době dělo u podobných lidí bez změny?",
                "Co přesně znamená zlepšení? Kdo jej měřil a jak velký byl rozdíl?",
              ][value]
            }
          </Text>
        </>
      );
  } else if (id === "electricity") {
    title =
      step === 0
        ? "STÁLÝ PŘÍKON / RŮZNÝ ČAS"
        : step === 1
          ? "JEDNODUCHÝ DC OBVOD"
          : "100 Wh NA VSTUPU";
    const hours = [0.5, 1, 2][value],
      amps = [1, 2, 3][value],
      efficiency = [50, 75, 90][value];
    content =
      step === 0 ? (
        <>
          {options(["30 min", "1 hodina", "2 hodiny"])}
          {number(`${energyKWh(2000, hours).toLocaleString("cs-CZ")} kWh`)}
          <Text style={s.text}>
            Topidlo se stálým příkonem 2 000 W běží{" "}
            {hours.toLocaleString("cs-CZ")} h.
          </Text>
        </>
      ) : step === 1 ? (
        <>
          {options(["1 A", "2 A", "3 A"])}
          {number(`${12 * amps} W`)}
          <Text style={s.text}>
            12 V × {amps} A. Model stejnosměrného obvodu.
          </Text>
        </>
      ) : (
        <>
          {options(["50 %", "75 %", "90 %"])}
          <View
            style={{
              height: 22,
              flexDirection: "row",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <View style={{ flex: efficiency, backgroundColor: mint }} />
            <View
              style={{ flex: 100 - efficiency, backgroundColor: `${color}60` }}
            />
          </View>
          {number(`${efficiency} Wh užitek`)}
          <Text style={s.text}>
            {100 - efficiency} Wh se přemění například v teplo. Celkem stále 100
            Wh.
          </Text>
        </>
      );
  } else {
    title = step === 0 ? "PROCHÁZEJ JEDEN PO DRUHÉM" : "PROJDI HLEDÁNÍ PŮLENÍM";
    const values = [2, 4, 6, 8, 10, 12, 14],
      target = [14, 2, 10][value],
      trace = binaryTrace(values, target),
      frame = trace[Math.min(index, trace.length - 1)];
    const cursor =
      step === 0 ? Math.min(index, values.indexOf(target)) : frame.mid;
    const found = values[cursor] === target,
      last = step === 0 ? values.indexOf(target) : trace.length - 1;
    content = (
      <>
        {options(["Hledej 14", "Hledej 2", "Hledej 10"])}
        <View style={[s.row, { gap: 4, justifyContent: "center" }]}>
          {values.map((n, i) => (
            <View
              key={n}
              style={{
                flex: 1,
                paddingVertical: 12,
                alignItems: "center",
                borderRadius: 8,
                opacity:
                  step > 0 && (i < frame.low || i > frame.high) ? 0.25 : 1,
                backgroundColor:
                  i === cursor ? (found ? mint : color) : "#ffffff0a",
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  color: i === cursor ? "#131313" : "#e2e2e2",
                }}
              >
                {n}
              </Text>
            </View>
          ))}
        </View>
        <Text accessibilityLiveRegion="polite" style={s.text}>
          {found
            ? `Nalezeno: ${target}. Počet kontrol: ${index + 1}.`
            : step === 0
              ? `${values[cursor]} není ${target}. Posuň se k dalšímu prvku.`
              : `Prostředek ${values[cursor]} ${values[cursor] < target ? "<" : ">"} ${target}. Dál hledej ${values[cursor] < target ? "vpravo" : "vlevo"}.`}
        </Text>
        <Button quiet onPress={() => setIndex(index >= last ? 0 : index + 1)}>
          {index >= last ? "Zkusit od začátku" : "Další porovnání"}
        </Button>
      </>
    );
    note =
      "Zvýrazněný prvek je právě kontrolovaný. U půlení zeslábne vyřazená část.";
  }
  return (
    <View
      style={[
        s.card,
        {
          padding: 18,
          gap: 16,
          backgroundColor: "#141414",
          borderColor: `${mint}35`,
          borderTopWidth: 0,
          borderLeftWidth: 2,
          borderRadius: 0,
        },
      ]}
    >
      <Text style={[s.label, { color: mint }]}>LABORATOŘ / {title}</Text>
      {content}
      {note ? <Text style={s.muted}>{note}</Text> : null}
    </View>
  );
}
