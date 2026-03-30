import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

export interface Country {
  flag: string;
  name: string;
  code: string;
}

export const COUNTRIES: Country[] = [
  { flag: "🇵🇰", name: "Pakistan", code: "92" },
  { flag: "🇦🇪", name: "UAE", code: "971" },
  { flag: "🇸🇦", name: "Saudi Arabia", code: "966" },
  { flag: "🇬🇧", name: "United Kingdom", code: "44" },
  { flag: "🇺🇸", name: "USA", code: "1" },
  { flag: "🇨🇦", name: "Canada", code: "1" },
  { flag: "🇦🇺", name: "Australia", code: "61" },
  { flag: "🇮🇳", name: "India", code: "91" },
  { flag: "🇧🇩", name: "Bangladesh", code: "880" },
  { flag: "🇲🇾", name: "Malaysia", code: "60" },
  { flag: "🇧🇭", name: "Bahrain", code: "973" },
  { flag: "🇰🇼", name: "Kuwait", code: "965" },
  { flag: "🇶🇦", name: "Qatar", code: "974" },
  { flag: "🇴🇲", name: "Oman", code: "968" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export function detectCountry(fullNumber: string): { country: Country; local: string } {
  const digits = fullNumber.replace(/\D/g, "");
  const byLen = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  for (const c of byLen) {
    if (digits.startsWith(c.code)) {
      return { country: c, local: digits.slice(c.code.length) };
    }
  }
  return { country: DEFAULT_COUNTRY, local: digits };
}

interface Props {
  selected: Country;
  onSelect: (c: Country) => void;
  disabled?: boolean;
}

export default function CountryCodePicker({ selected, onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const insets = useSafeAreaInsets();

  const filtered = COUNTRIES.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search.replace(/\D/g, ""))
  );

  return (
    <>
      <Pressable
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setOpen(true)}
      >
        <Text style={styles.flag}>{selected.flag}</Text>
        <Text style={styles.code}>+{selected.code}</Text>
        {!disabled && (
          <Ionicons name="chevron-down" size={12} color={Colors.light.textMuted} style={{ marginLeft: 1 }} />
        )}
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Select Country Code</Text>

          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={16} color={Colors.light.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search country..."
              placeholderTextColor={Colors.light.textMuted}
              autoCapitalize="none"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item, i) => `${item.code}-${item.name}-${i}`}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                  selected.name === item.name && styles.rowSelected,
                ]}
                onPress={() => { onSelect(item); setOpen(false); setSearch(""); }}
              >
                <Text style={styles.rowFlag}>{item.flag}</Text>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowCode}>+{item.code}</Text>
                {selected.name === item.name && (
                  <Ionicons name="checkmark" size={16} color={Colors.light.primary} style={{ marginLeft: 4 }} />
                )}
              </Pressable>
            )}
            showsVerticalScrollIndicator={false}
            style={styles.list}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 10,
    paddingLeft: 2,
    borderRightWidth: 1,
    borderRightColor: Colors.light.border,
    marginRight: 8,
    height: 28,
  },
  triggerDisabled: { opacity: 0.6 },
  flag: { fontSize: 18 },
  code: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.text },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: Colors.light.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: "70%",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.light.border,
    alignSelf: "center", marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 16, fontFamily: "Inter_600SemiBold",
    color: Colors.light.text, marginBottom: 12,
    textAlign: "center",
  },
  searchWrapper: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.light.border,
    paddingHorizontal: 12, height: 40, marginBottom: 8,
  },
  searchInput: {
    flex: 1, fontSize: 14, fontFamily: "Inter_400Regular",
    color: Colors.light.text,
  },
  list: { flexGrow: 0 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border + "60",
  },
  rowPressed: { backgroundColor: Colors.light.backgroundSecondary },
  rowSelected: { backgroundColor: Colors.light.primary + "0D" },
  rowFlag: { fontSize: 22, width: 30 },
  rowName: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text },
  rowCode: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary },
});
