import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { api, Chapter } from "@/hooks/useApi";

function ChapterCard({ chapter }: { chapter: Chapter }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      onPress={() => router.push({
        pathname: "/content/[chapterId]",
        params: { chapterId: chapter.id, chapterName: chapter.name }
      })}
    >
      <View style={[styles.orderBadge, { backgroundColor: Colors.light.primary + "14" }]}>
        <Text style={styles.orderText}>{chapter.orderNumber}</Text>
      </View>
      <View style={styles.cardCenter}>
        <Text style={styles.chapterName}>{chapter.name}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Ionicons name="pencil-outline" size={12} color={Colors.light.textMuted} />
            <Text style={styles.statChipText}>Practice</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.light.textMuted} />
    </Pressable>
  );
}

export default function ChaptersListScreen() {
  const { subjectId, subjectName } = useLocalSearchParams<{ subjectId: string; subjectName: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const { data: chapters, isLoading, error, refetch } = useQuery({
    queryKey: ["chapters", subjectId],
    queryFn: () => api.getChapters(Number(subjectId)),
    enabled: !!subjectId,
  });

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.parentLabel} numberOfLines={1}>{subjectName}</Text>
          <Text style={styles.screenTitle}>Chapters</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.light.error} />
          <Text style={styles.errorText}>Failed to load chapters</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={chapters ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ChapterCard chapter={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 : 30 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="layers-outline" size={64} color={Colors.light.textMuted} />
              <Text style={styles.emptyText}>No chapters found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.light.card, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  headerTitles: { flex: 1 },
  parentLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text },
  list: { paddingHorizontal: 16, gap: 10, paddingTop: 4 },
  card: {
    backgroundColor: Colors.light.card, borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  orderBadge: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  orderText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  cardCenter: { flex: 1, gap: 6 },
  chapterName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  statsRow: { flexDirection: "row", gap: 8 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  statChipText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.error },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.light.primary, borderRadius: 10 },
  retryText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
});
