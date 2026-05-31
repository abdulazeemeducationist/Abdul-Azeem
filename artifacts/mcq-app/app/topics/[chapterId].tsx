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
import { api, Topic } from "@/hooks/useApi";

function TopicCard({ topic }: { topic: Topic }) {
  const hasQuestions = topic.questionCount > 0;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { opacity: pressed && hasQuestions ? 0.9 : 1, transform: [{ scale: pressed && hasQuestions ? 0.98 : 1 }] }
      ]}
      onPress={() => {
        if (!hasQuestions) return;
        router.push({ pathname: "/practice/[topicId]", params: { topicId: topic.id, topicName: topic.name } });
      }}
      disabled={!hasQuestions}
    >
      <View style={styles.topicLeft}>
        <Ionicons
          name={hasQuestions ? "play-circle" : "ellipse-outline"}
          size={32}
          color={hasQuestions ? Colors.light.primary : Colors.light.textMuted}
        />
      </View>
      <View style={styles.cardCenter}>
        <Text style={[styles.topicName, !hasQuestions && styles.textMuted]}>{topic.name}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Ionicons name="help-circle-outline" size={12} color={hasQuestions ? Colors.light.primary : Colors.light.textMuted} />
            <Text style={[styles.statChipText, hasQuestions && { color: Colors.light.primary }]}>
              {hasQuestions ? `${topic.questionCount} OTQs` : "No questions yet"}
            </Text>
          </View>
        </View>
      </View>
      {hasQuestions && <Ionicons name="chevron-forward" size={18} color={Colors.light.textMuted} />}
    </Pressable>
  );
}

export default function TopicsScreen() {
  const { chapterId, chapterName } = useLocalSearchParams<{ chapterId: string; chapterName: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const { data: topics, isLoading, error, refetch } = useQuery({
    queryKey: ["topics", chapterId],
    queryFn: () => api.getTopics(Number(chapterId)),
    enabled: !!chapterId,
  });

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.parentLabel} numberOfLines={1}>{chapterName}</Text>
          <Text style={styles.screenTitle}>Topics</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.light.error} />
          <Text style={styles.errorText}>Failed to load topics</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={topics ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <TopicCard topic={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 : 30 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="bookmark-outline" size={64} color={Colors.light.textMuted} />
              <Text style={styles.emptyText}>No topics found</Text>
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
  topicLeft: { width: 36, alignItems: "center" },
  cardCenter: { flex: 1, gap: 6 },
  topicName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  textMuted: { color: Colors.light.textMuted },
  statsRow: { flexDirection: "row", gap: 8 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  statChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.error },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.light.primary, borderRadius: 10 },
  retryText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
});
