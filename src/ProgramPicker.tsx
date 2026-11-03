import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { definitions, type Data, type ProgramId } from "./model";

const programs: ProgramId[] = ["porn", "scroll", "food"];
const descriptions = {
  porn: "Série, tvoje proč a podpora",
  scroll: "Pozornost, odložení telefonu a čas",
  food: "Vlastní pravidla a každodenní volby",
};
export function ProgramPicker({
  selected,
  data,
  onChange,
}: {
  selected: ProgramId;
  data: Data;
  onChange: (id: ProgramId) => void;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Změnit program: ${definitions[selected].title}`}
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={() => setOpen(true)}
        style={s.trigger}
      >
        <View style={{ gap: 5 }}>
          <Text style={s.micro}>TVŮJ PROGRAM</Text>
          <Text style={s.current}>{definitions[selected].title}</Text>
        </View>
        <View style={s.chevron}>
          <Text style={{ color: "#EEEEEE", fontSize: 18 }}>⌄</Text>
        </View>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Zavřít výběr programu"
            onPress={() => setOpen(false)}
          />
          <View
            accessibilityViewIsModal
            style={[s.sheet, { paddingBottom: Math.max(22, insets.bottom) }]}
          >
            <View style={s.handle} />
            <View style={s.between}>
              <Text style={s.title}>Čemu se chceš věnovat?</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Zavřít menu programů"
                onPress={() => setOpen(false)}
                style={s.close}
              >
                <Text style={{ color: "#BBB", fontSize: 23 }}>×</Text>
              </Pressable>
            </View>
            {programs.map((id) => (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`Vybrat ${definitions[id].title}`}
                accessibilityState={{ selected: id === selected }}
                aria-pressed={id === selected}
                onPress={() => {
                  setOpen(false);
                  onChange(id);
                }}
                style={[
                  s.option,
                  id === selected && { borderLeftColor: "#F5F5F5" },
                ]}
              >
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={s.name}>{definitions[id].title}</Text>
                  <Text style={s.detail}>
                    {id === "scroll" && data.scroll?.attention?.active
                      ? (data.scroll.attention.active.startedAt +
                          data.scroll.attention.active.durationMinutes * 60000 >
                        Date.now()
                          ? "Běží odložení telefonu · "
                          : "Blok čeká na potvrzení · ") +
                        data.scroll.attention.active.activity
                      : descriptions[id]}
                  </Text>
                  {!data[id] && (
                    <Text style={s.micro}>PŘIPRAVENÉ K ZAHÁJENÍ</Text>
                  )}
                </View>
                <Text
                  style={{
                    color: id === selected ? "#F5F5F5" : "#666",
                    fontSize: 20,
                  }}
                >
                  {id === selected ? "✓" : "›"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  trigger: {
    marginHorizontal: 20,
    paddingVertical: 14,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#ffffff16",
  },
  micro: { color: "#777", fontSize: 8, letterSpacing: 1.6, fontWeight: "600" },
  current: {
    color: "#F4F4F4",
    fontSize: 19,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  chevron: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ffffff08",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#000000B8",
  },
  sheet: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 32,
    height: 3,
    borderRadius: 3,
    backgroundColor: "#555",
    marginBottom: 18,
  },
  between: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: {
    color: "#F5F5F5",
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: -0.8,
  },
  close: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  option: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderLeftWidth: 2,
    borderLeftColor: "transparent",
    borderBottomColor: "#ffffff12",
    paddingVertical: 22,
    paddingLeft: 12,
  },
  name: { color: "#F3F3F3", fontSize: 20, fontWeight: "500" },
  detail: { color: "#979797", fontSize: 12, lineHeight: 18 },
});
