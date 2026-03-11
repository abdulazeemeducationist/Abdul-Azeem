import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    if (!email.trim()) { setError("Please enter your email address"); return; }
    setError("");
    setLoading(true);
    try {
      await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.content, { paddingTop: Math.max(insets.top + 12, 60) }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>

        {sent ? (
          <View style={styles.successSection}>
            <View style={styles.successIcon}>
              <Ionicons name="mail" size={40} color={Colors.light.success} />
            </View>
            <Text style={styles.successTitle}>Check your inbox</Text>
            <Text style={styles.successDesc}>
              If an account with {email} exists, you'll receive a reset link shortly.
            </Text>
            <Pressable style={styles.backToSignIn} onPress={() => router.push("/auth/signin")}>
              <Text style={styles.backToSignInText}>Back to Sign In</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your email and we'll send you a reset link.</Text>

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
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.resetBtn, { opacity: pressed || loading ? 0.85 : 1 }]}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.resetBtnText}>Send Reset Link</Text>}
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { flex: 1, paddingHorizontal: 20, gap: 16 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.light.text },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 20 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.error + "12", borderRadius: 10, padding: 12 },
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
  resetBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center",
  },
  resetBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  successSection: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingBottom: 40 },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.light.success + "18", alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.light.text },
  successDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center", lineHeight: 20, maxWidth: 280 },
  backToSignIn: {
    backgroundColor: Colors.light.primary, borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 32, marginTop: 8,
  },
  backToSignInText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});
