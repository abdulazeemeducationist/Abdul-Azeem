import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import Colors from "@/constants/colors";
import { api, ChapterVideo, ChapterNote, Topic } from "@/hooks/useApi";

type ContentTab = "videos" | "notes" | "practice";

function getVideoId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function VideoPlayerModal({ video, onClose }: { video: ChapterVideo; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const videoId = getVideoId(video.youtubeUrl);
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`
    : video.youtubeUrl;

  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box;background:#000}body{display:flex;align-items:center;justify-content:center;height:100vh;width:100vw}iframe{width:100%;height:100%;border:none}</style></head><body><iframe src="${embedUrl}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;fullscreen" allowfullscreen></iframe></body></html>`;

  const player = Platform.OS === "web"
    ? React.createElement("iframe", {
        src: embedUrl,
        style: { width: "100%", height: "100%", border: "none" } as any,
        allow: "accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;fullscreen",
        allowFullScreen: true,
      })
    : (
        <WebView
          source={{ html }}
          style={playerStyles.webview}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          scrollEnabled={false}
        />
      );

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={playerStyles.container}>
        {/* Header */}
        <View style={[playerStyles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <Pressable style={playerStyles.closeBtn} onPress={onClose}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </Pressable>
          <Text style={playerStyles.headerTitle} numberOfLines={2}>{video.title}</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Embedded player */}
        <View style={playerStyles.playerBox}>
          {player}
        </View>

        {/* Description */}
        {video.description ? (
          <ScrollView style={playerStyles.descScroll} contentContainerStyle={playerStyles.descContent}>
            <Text style={playerStyles.descTitle}>{video.title}</Text>
            <Text style={playerStyles.descText}>{video.description}</Text>
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

const playerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 12, gap: 10 },
  closeBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF", lineHeight: 19 },
  playerBox: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" },
  webview: { flex: 1, backgroundColor: "#000" },
  descScroll: { flex: 1, backgroundColor: "#111" },
  descContent: { padding: 16, gap: 8 },
  descTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF", lineHeight: 21 },
  descText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#AAA", lineHeight: 20 },
});

function VideoCard({ video, onPlay }: { video: ChapterVideo; onPlay: () => void }) {
  const videoId = getVideoId(video.youtubeUrl);
  const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.videoCard, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
      onPress={onPlay}
    >
      <View style={styles.thumbnailBox}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumbImageBox} contentFit="cover" />
        ) : (
          <View style={[styles.thumbImageBox, styles.thumbFallback]}>
            <Ionicons name="logo-youtube" size={28} color="#FF0000" />
          </View>
        )}
        <View style={styles.playOverlay}>
          <View style={styles.playCircle}>
            <Ionicons name="play" size={16} color="#FFF" style={{ marginLeft: 2 }} />
          </View>
        </View>
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
        {video.description ? (
          <Text style={styles.videoDesc} numberOfLines={1}>{video.description}</Text>
        ) : null}
        <View style={styles.watchRow}>
          <Ionicons name="play-circle" size={12} color={Colors.light.primary} />
          <Text style={styles.watchText}>Tap to watch</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.light.textMuted} />
    </Pressable>
  );
}

function NoteCard({ note }: { note: ChapterNote }) {
  const handleOpen = () => {
    Linking.openURL(note.fileUrl).catch(() => {});
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.noteCard, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      onPress={handleOpen}
    >
      <View style={styles.noteIconBox}>
        <Ionicons name="document-text" size={22} color="#DC2626" />
      </View>
      <View style={styles.noteInfo}>
        <Text style={styles.noteTitle} numberOfLines={2}>{note.title}</Text>
        {note.description ? (
          <Text style={styles.noteDesc} numberOfLines={1}>{note.description}</Text>
        ) : null}
        <View style={styles.openRow}>
          <Ionicons name="link-outline" size={12} color={Colors.light.primary} />
          <Text style={styles.openText}>Open PDF</Text>
        </View>
      </View>
      <Ionicons name="open-outline" size={18} color={Colors.light.textMuted} />
    </Pressable>
  );
}

function TopicPracticeCard({ topic }: { topic: Topic }) {
  const hasQuestions = topic.questionCount > 0;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.practiceCard,
        { opacity: pressed && hasQuestions ? 0.9 : 1, transform: [{ scale: pressed && hasQuestions ? 0.98 : 1 }] }
      ]}
      onPress={() => {
        if (!hasQuestions) return;
        router.push({ pathname: "/practice/[topicId]", params: { topicId: topic.id, topicName: topic.name } });
      }}
      disabled={!hasQuestions}
    >
      <Ionicons
        name={hasQuestions ? "play-circle" : "ellipse-outline"}
        size={32}
        color={hasQuestions ? Colors.light.primary : Colors.light.textMuted}
      />
      <View style={styles.practiceInfo}>
        <Text style={[styles.practiceTitle, !hasQuestions && styles.textMuted]}>{topic.name}</Text>
        <View style={styles.statChipRow}>
          <View style={[styles.statChip, hasQuestions && { backgroundColor: Colors.light.primary + "14" }]}>
            <Ionicons name="help-circle-outline" size={12} color={hasQuestions ? Colors.light.primary : Colors.light.textMuted} />
            <Text style={[styles.statChipText, hasQuestions && { color: Colors.light.primary }]}>
              {hasQuestions ? `${topic.questionCount} MCQs` : "No questions yet"}
            </Text>
          </View>
        </View>
      </View>
      {hasQuestions && <Ionicons name="chevron-forward" size={18} color={Colors.light.textMuted} />}
    </Pressable>
  );
}

export default function ContentScreen() {
  const { chapterId, chapterName } = useLocalSearchParams<{ chapterId: string; chapterName: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const [activeTab, setActiveTab] = useState<ContentTab>("videos");
  const [playingVideo, setPlayingVideo] = useState<ChapterVideo | null>(null);

  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ["chapter-videos", chapterId],
    queryFn: () => api.getChapterVideos(Number(chapterId)),
    enabled: !!chapterId,
  });

  const { data: notes, isLoading: notesLoading } = useQuery({
    queryKey: ["chapter-notes", chapterId],
    queryFn: () => api.getChapterNotes(Number(chapterId)),
    enabled: !!chapterId,
  });

  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ["topics", chapterId],
    queryFn: () => api.getTopics(Number(chapterId)),
    enabled: !!chapterId,
  });

  const tabs: { key: ContentTab; label: string; icon: string; count?: number }[] = [
    { key: "videos",   label: "Videos",   icon: "play-circle-outline",   count: videos?.length },
    { key: "notes",    label: "Notes",    icon: "document-text-outline",  count: notes?.length },
    { key: "practice", label: "Practice", icon: "help-circle-outline",    count: topics?.length },
  ];

  const renderContent = () => {
    if (activeTab === "videos") {
      if (videosLoading) return <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 40 }} />;
      if (!videos?.length) return (
        <View style={styles.emptyBox}>
          <Ionicons name="play-circle-outline" size={52} color={Colors.light.textMuted} />
          <Text style={styles.emptyTitle}>No videos yet</Text>
          <Text style={styles.emptySubtitle}>Video lectures for this chapter will appear here</Text>
        </View>
      );
      return videos.map(v => <VideoCard key={v.id} video={v} onPlay={() => setPlayingVideo(v)} />);
    }

    if (activeTab === "notes") {
      if (notesLoading) return <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 40 }} />;
      if (!notes?.length) return (
        <View style={styles.emptyBox}>
          <Ionicons name="document-text-outline" size={52} color={Colors.light.textMuted} />
          <Text style={styles.emptyTitle}>No notes yet</Text>
          <Text style={styles.emptySubtitle}>Study notes PDFs for this chapter will appear here</Text>
        </View>
      );
      return notes.map(n => <NoteCard key={n.id} note={n} />);
    }

    if (activeTab === "practice") {
      if (topicsLoading) return <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 40 }} />;
      if (!topics?.length) return (
        <View style={styles.emptyBox}>
          <Ionicons name="help-circle-outline" size={52} color={Colors.light.textMuted} />
          <Text style={styles.emptyTitle}>No MCQs yet</Text>
          <Text style={styles.emptySubtitle}>Practice questions for this chapter will appear here</Text>
        </View>
      );
      return topics.map(t => <TopicPracticeCard key={t.id} topic={t} />);
    }

    return null;
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {playingVideo && (
        <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />
      )}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.parentLabel} numberOfLines={1}>{chapterName}</Text>
          <Text style={styles.screenTitle}>Content</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? Colors.light.primary : Colors.light.textMuted}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
            {tab.count !== undefined && tab.count > 0 && (
              <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>{tab.count}</Text>
              </View>
            )}
            {activeTab === tab.key && <View style={styles.tabIndicator} />}
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: isWeb ? 34 : 30 }]}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.light.card, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  headerTitles: { flex: 1 },
  parentLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text },

  tabBar: { flexDirection: "row", backgroundColor: Colors.light.card, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 11, gap: 5, position: "relative" },
  tabBtnActive: {},
  tabLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  tabLabelActive: { fontFamily: "Inter_600SemiBold", color: Colors.light.primary },
  tabBadge: { backgroundColor: Colors.light.backgroundSecondary, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeActive: { backgroundColor: Colors.light.primary + "18" },
  tabBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.light.textMuted },
  tabBadgeTextActive: { color: Colors.light.primary },
  tabIndicator: { position: "absolute", bottom: 0, left: 10, right: 10, height: 2.5, backgroundColor: Colors.light.primary, borderRadius: 2 },

  content: { padding: 16, gap: 10 },

  videoCard: {
    backgroundColor: Colors.light.card, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 12, padding: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  thumbnailBox: { width: 80, height: 56, borderRadius: 10, overflow: "hidden", position: "relative", backgroundColor: "#000" },
  thumbImageBox: { width: "100%", height: "100%" },
  thumbFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6" },
  playOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)" } as any,
  playCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.primary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 6 },
  videoInfo: { flex: 1, gap: 3 },
  videoTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.text, lineHeight: 18 },
  videoDesc: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  watchRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  watchText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.light.primary },

  noteCard: {
    backgroundColor: Colors.light.card, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  noteIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
  noteInfo: { flex: 1, gap: 3 },
  noteTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text, lineHeight: 19 },
  noteDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  openRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  openText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.light.primary },

  practiceCard: {
    backgroundColor: Colors.light.card, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  practiceInfo: { flex: 1, gap: 6 },
  practiceTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  textMuted: { color: Colors.light.textMuted },
  statChipRow: { flexDirection: "row" },
  statChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  statChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },

  emptyBox: { paddingTop: 60, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "center", maxWidth: 260 },
});
