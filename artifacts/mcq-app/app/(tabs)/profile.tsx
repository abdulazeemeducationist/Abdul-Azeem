import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

interface MenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  rightText?: string;
}

function MenuRow({ icon, label, onPress, color, rightText }: MenuRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.menuIcon, { backgroundColor: (color ?? Colors.light.primary) + "18" }]}>
        <Ionicons name={icon} size={20} color={color ?? Colors.light.primary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={{ flex: 1 }} />
      {rightText ? <Text style={styles.menuRightText}>{rightText}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={Colors.light.textMuted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <ScrollView style={[styles.container, { paddingTop: topPad }]} contentContainerStyle={{ paddingBottom: isWeb ? 34 + 84 : 100 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        {user?.role === "admin" && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Admin</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuGroup}>
          <MenuRow icon="person-outline" label="Edit Profile" onPress={() => {}} />
          <View style={styles.divider} />
          <MenuRow icon="lock-closed-outline" label="Change Password" onPress={() => {}} />
          <View style={styles.divider} />
          <MenuRow icon="notifications-outline" label="Notifications" onPress={() => {}} />
        </View>
      </View>

      {user?.role === "admin" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Administration</Text>
          <View style={styles.menuGroup}>
            <MenuRow icon="settings-outline" label="Admin Panel" onPress={() => router.push("/admin")} color="#7B2D8B" />
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.menuGroup}>
          <MenuRow icon="information-circle-outline" label="About" onPress={() => {}} />
          <View style={styles.divider} />
          <MenuRow icon="help-circle-outline" label="Help & Support" onPress={() => {}} />
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [styles.signOutBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.light.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      <Text style={styles.versionText}>MCQ Pro v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 12 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.light.text },
  avatarSection: { alignItems: "center", paddingVertical: 24, gap: 6 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.light.primary, alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFF" },
  userName: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  userEmail: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  roleBadge: {
    backgroundColor: Colors.light.primary + "18", paddingHorizontal: 12,
    paddingVertical: 4, borderRadius: 20, marginTop: 4,
  },
  roleText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },
  section: { marginBottom: 8, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4,
  },
  menuGroup: {
    backgroundColor: Colors.light.card, borderRadius: 14, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  menuRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.light.text },
  menuRightText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  divider: { height: 1, backgroundColor: Colors.light.border, marginLeft: 62 },
  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, padding: 16, backgroundColor: Colors.light.error + "12",
    borderRadius: 14,
  },
  signOutText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.light.error },
  versionText: {
    textAlign: "center", color: Colors.light.textMuted,
    fontSize: 12, fontFamily: "Inter_400Regular", paddingVertical: 16,
  },
});
