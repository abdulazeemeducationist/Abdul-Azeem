import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api, Subject } from "@/hooks/useApi";

function PaperCard({ subject, onLockedPress }: { subject: Subject; onLockedPress: () => void }) {
  const handlePress = () => {
    if (!subject.purchased) { onLockedPress(); return; }
    router.push({
      pathname: "/chapters/[subjectId]",
      params: { subjectId: subject.id, subjectName: subject.name }
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        !subject.purchased && styles.cardLocked,
        { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
      ]}
      onPress={handlePress}
    >
      <View style={[styles.codeTag, { backgroundColor: subject.purchased ? Colors.light.primary + "14" : "#F3F4F6" }]}>
        <Text style={[styles.codeText, { color: subject.purchased ? Colors.light.primary : Colors.light.textMuted }]}>
          {subject.code}
        </Text>
      </View>
      <View style={styles.cardCenter}>
        <Text style={[styles.paperName, !subject.purchased && styles.textMuted]} numberOfLines={2}>
          {subject.name}
        </Text>
        {subject.description ? (
          <Text style={styles.desc} numberOfLines={1}>{subject.description}</Text>
        ) : null}
        <View style={styles.statsRow}>
          {subject.purchased ? (
            <>
              <View style={styles.statChip}>
                <Ionicons name="layers-outline" size={12} color={Colors.light.textMuted} />
                <Text style={styles.statChipText}>{subject.chapterCount} Chapters</Text>
              </View>
              <View style={styles.statChip}>
                <Ionicons name="help-circle-outline" size={12} color={Colors.light.textMuted} />
                <Text style={styles.statChipText}>{subject.questionCount} OTQs</Text>
              </View>
            </>
          ) : (
            <View style={[
              styles.lockedBadge,
              subject.accessStatus === 'expired' && styles.lockedBadgeExpired,
              subject.accessStatus === 'blocked' && styles.lockedBadgeBlocked,
            ]}>
              <Ionicons
                name={subject.accessStatus === 'expired' ? 'time-outline' : subject.accessStatus === 'blocked' ? 'ban-outline' : 'lock-closed'}
                size={11}
                color={subject.accessStatus === 'expired' ? '#D97706' : subject.accessStatus === 'blocked' ? '#DC2626' : '#6B7280'}
              />
              <Text style={[
                styles.lockedText,
                subject.accessStatus === 'expired' && styles.lockedTextExpired,
                subject.accessStatus === 'blocked' && styles.lockedTextBlocked,
              ]}>
                {subject.accessStatus === 'expired' ? 'Access Expired' : subject.accessStatus === 'blocked' ? 'Access Blocked' : 'Locked — Contact admin'}
              </Text>
            </View>
          )}
        </View>
      </View>
      {subject.purchased ? (
        <Ionicons name="chevron-forward" size={18} color={Colors.light.textMuted} />
      ) : (
        <Ionicons
          name={subject.accessStatus === 'expired' ? 'time-outline' : subject.accessStatus === 'blocked' ? 'ban-outline' : 'lock-closed-outline'}
          size={18}
          color={subject.accessStatus === 'expired' ? '#D97706' : subject.accessStatus === 'blocked' ? '#DC2626' : '#9CA3AF'}
        />
      )}
    </Pressable>
  );
}

export default function PapersScreen() {
  const { levelId, levelName, courseId, courseName, courseCode } =
    useLocalSearchParams<{ levelId: string; levelName: string; courseId: string; courseName: string; courseCode: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const { data: subjects, isLoading, error, refetch } = useQuery({
    queryKey: ["subjects-by-level", levelId, user?.id],
    queryFn: () => api.getSubjectsByLevel(Number(levelId), user?.role === "admin" ? undefined : user?.id),
    enabled: !!levelId,
  });

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.breadcrumb}>{courseCode} · {levelName}</Text>
          <Text style={styles.screenTitle}>Papers</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.light.error} />
          <Text style={styles.errorText}>Failed to load papers</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={subjects ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PaperCard
              subject={item}
              onLockedPress={() => {
                const s = item;
                const title = s.accessStatus === 'expired' ? "Access Expired" : s.accessStatus === 'blocked' ? "Access Blocked" : "Paper Locked";
                const msg = s.accessStatus === 'expired'
                  ? "Your access to this paper has expired. Please contact your admin to renew."
                  : s.accessStatus === 'blocked'
                  ? "Access to this paper has been blocked. Please contact your admin."
                  : "This paper is not included in your plan. Please contact your admin to unlock access.";
                Alert.alert(title, msg, [{ text: "OK" }]);
              }}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 : 30 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="document-outline" size={64} color={Colors.light.textMuted} />
              <Text style={styles.emptyText}>No papers found</Text>
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
  breadcrumb: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.primary, textTransform: "uppercase", letterSpacing: 0.5 },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text },
  list: { paddingHorizontal: 16, gap: 10, paddingTop: 4 },
  card: {
    backgroundColor: Colors.light.card, borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardLocked: { opacity: 0.8 },
  codeTag: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  codeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  cardCenter: { flex: 1, gap: 4 },
  paperName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text, lineHeight: 19 },
  textMuted: { color: Colors.light.textMuted },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 4, flexWrap: "wrap" },
  statChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  statChipText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  lockedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F3F4F6", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  lockedBadgeExpired: { backgroundColor: "#FEF3C7" },
  lockedBadgeBlocked: { backgroundColor: "#FEE2E2" },
  lockedText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#6B7280" },
  lockedTextExpired: { color: "#D97706" },
  lockedTextBlocked: { color: "#DC2626" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.error },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.light.primary, borderRadius: 10 },
  retryText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
});
