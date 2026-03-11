import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e.message || "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 20, 60) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="book" size={36} color="#FFF" />
          </View>
          <Text style={styles.appName}>MCQ Pro</Text>
          <Text style={styles.tagline}>Practice. Learn. Excel.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to continue your learning journey</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.light.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={Colors.light.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.light.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.light.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={Colors.light.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye" : "eye-off"} size={18} color={Colors.light.textMuted} />
              </Pressable>
            </View>
          </View>

          <Pressable onPress={() => router.push("/auth/reset")} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.signInBtn, { opacity: pressed || loading ? 0.85 : 1 }]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.signInBtnText}>Sign In</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <Pressable style={({ pressed }) => [styles.socialBtn, { opacity: pressed ? 0.7 : 1 }]}>
              <Ionicons name="logo-google" size={20} color="#EA4335" />
              <Text style={styles.socialBtnText}>Google</Text>
            </Pressable>
            {Platform.OS === "ios" && (
              <Pressable style={({ pressed }) => [styles.socialBtn, { opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons name="logo-apple" size={20} color="#000" />
                <Text style={styles.socialBtnText}>Apple</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Don't have an account? </Text>
          <Pressable onPress={() => router.push("/auth/signup")}>
            <Text style={styles.linkText}>Sign Up</Text>
          </Pressable>
        </View>

        <View style={{ height: Math.max(insets.bottom + 20, 40) }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.light.background },
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { paddingHorizontal: 20 },
  logoSection: { alignItems: "center", marginBottom: 28, gap: 6 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: Colors.light.primary, alignItems: "center", justifyContent: "center",
    shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  appName: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.light.text },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  card: {
    backgroundColor: Colors.light.card, borderRadius: 20, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    gap: 12,
  },
  cardTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text },
  cardSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, marginTop: -4 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.light.error + "12", borderRadius: 10, padding: 12,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.error },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border,
    paddingHorizontal: 12, height: 48,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.light.text },
  inputFlex: { flex: 1 },
  eyeBtn: { padding: 4 },
  forgotBtn: { alignSelf: "flex-end", marginTop: -4 },
  forgotText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.accent },
  signInBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center", marginTop: 4,
  },
  signInBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.light.border },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  socialRow: { flexDirection: "row", gap: 12 },
  socialBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 48, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.light.border, backgroundColor: Colors.light.card,
  },
  socialBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.text },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20 },
  bottomText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  linkText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },
});
