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

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
    } catch (e: any) {
      setError(e.message || "Sign up failed. Please try again.");
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
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 12, 60) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>

        <View style={styles.titleSection}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join thousands of students preparing for success</Text>
        </View>

        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.light.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={Colors.light.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={Colors.light.textMuted}
                autoCapitalize="words"
              />
            </View>
          </View>

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
                placeholder="Minimum 6 characters"
                placeholderTextColor={Colors.light.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye" : "eye-off"} size={18} color={Colors.light.textMuted} />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.signUpBtn, { opacity: pressed || loading ? 0.85 : 1 }]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.signUpBtnText}>Create Account</Text>
            )}
          </Pressable>

          <Text style={styles.termsText}>
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Already have an account? </Text>
          <Pressable onPress={() => router.push("/auth/signin")}>
            <Text style={styles.linkText}>Sign In</Text>
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
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  titleSection: { marginBottom: 20, gap: 6 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.light.text },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 20 },
  card: {
    backgroundColor: Colors.light.card, borderRadius: 20, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    gap: 12,
  },
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
  signUpBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center", marginTop: 4,
  },
  signUpBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  termsText: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.light.textMuted,
    textAlign: "center", lineHeight: 16,
  },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20 },
  bottomText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  linkText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },
});
