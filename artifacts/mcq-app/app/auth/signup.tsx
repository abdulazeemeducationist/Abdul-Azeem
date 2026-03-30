import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
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

type OtpStep = "idle" | "sending" | "sent" | "verifying" | "verified";

export default function SignUpScreen() {
  const { signUp, sendOtp, verifyOtp } = useAuth();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<OtpStep>("idle");
  const [phoneToken, setPhoneToken] = useState("");
  const [devCode, setDevCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpError, setOtpError] = useState("");

  const startResendCountdown = () => {
    setResendCountdown(60);
    countdownRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    setOtpError("");
    const cleaned = whatsapp.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setOtpError("Enter a valid WhatsApp number (min 10 digits)");
      return;
    }
    setOtpStep("sending");
    try {
      const result = await sendOtp(cleaned);
      setDevCode(result.devCode ?? "");
      setOtp("");
      setOtpStep("sent");
      startResendCountdown();
    } catch (e: any) {
      setOtpError(e.message || "Failed to send code");
      setOtpStep("idle");
    }
  };

  const handleVerifyCode = async () => {
    setOtpError("");
    if (otp.length !== 6) {
      setOtpError("Enter the 6-digit code");
      return;
    }
    const cleaned = whatsapp.replace(/\D/g, "");
    setOtpStep("verifying");
    try {
      const result = await verifyOtp(cleaned, otp);
      setPhoneToken(result.phoneToken);
      setOtpStep("verified");
    } catch (e: any) {
      setOtpError(e.message || "Incorrect code");
      setOtpStep("sent");
    }
  };

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (otpStep !== "verified") {
      setError("Please verify your WhatsApp number first");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password, whatsapp.replace(/\D/g, ""), phoneToken);
    } catch (e: any) {
      setError(e.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canSendCode = otpStep === "idle" || (otpStep === "sent" && resendCountdown === 0);
  const phoneVerified = otpStep === "verified";

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

          {/* Full Name */}
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

          {/* Email */}
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

          {/* Password */}
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

          {/* WhatsApp Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>WhatsApp Number</Text>
            <View style={[styles.inputWrapper, phoneVerified && styles.inputWrapperVerified]}>
              <Ionicons
                name="logo-whatsapp"
                size={18}
                color={phoneVerified ? "#25D366" : Colors.light.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={whatsapp}
                onChangeText={text => {
                  setWhatsapp(text);
                  if (otpStep !== "idle") { setOtpStep("idle"); setDevCode(""); setOtp(""); setOtpError(""); }
                }}
                placeholder="e.g. 03001234567"
                placeholderTextColor={Colors.light.textMuted}
                keyboardType="phone-pad"
                editable={!phoneVerified}
              />
              {phoneVerified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#25D366" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : (
                <Pressable
                  style={[styles.sendCodeBtn, (!canSendCode || otpStep === "sending") && styles.sendCodeBtnDisabled]}
                  onPress={handleSendCode}
                  disabled={!canSendCode || otpStep === "sending"}
                >
                  {otpStep === "sending" ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.sendCodeText}>
                      {otpStep === "sent" && resendCountdown > 0 ? `${resendCountdown}s` : "Send Code"}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>

            {/* Dev code info banner */}
            {devCode && otpStep === "sent" ? (
              <View style={styles.devBanner}>
                <Ionicons name="information-circle-outline" size={14} color="#1D4ED8" />
                <Text style={styles.devBannerText}>Test code: <Text style={styles.devCode}>{devCode}</Text></Text>
              </View>
            ) : null}

            {/* OTP input (after code sent) */}
            {(otpStep === "sent" || otpStep === "verifying") ? (
              <View style={styles.otpRow}>
                <TextInput
                  style={styles.otpInput}
                  value={otp}
                  onChangeText={v => { setOtp(v.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }}
                  placeholder="6-digit code"
                  placeholderTextColor={Colors.light.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Pressable
                  style={[styles.verifyBtn, (otp.length !== 6 || otpStep === "verifying") && styles.verifyBtnDisabled]}
                  onPress={handleVerifyCode}
                  disabled={otp.length !== 6 || otpStep === "verifying"}
                >
                  {otpStep === "verifying" ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.verifyBtnText}>Verify</Text>
                  )}
                </Pressable>
              </View>
            ) : null}

            {otpError ? (
              <View style={styles.otpErrorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={Colors.light.error} />
                <Text style={styles.otpErrorText}>{otpError}</Text>
              </View>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [styles.signUpBtn, { opacity: pressed || loading || !phoneVerified ? 0.7 : 1 }]}
            onPress={handleSignUp}
            disabled={loading || !phoneVerified}
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
  inputWrapperVerified: { borderColor: "#25D366", backgroundColor: "#F0FDF4" },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.light.text },
  inputFlex: { flex: 1 },
  eyeBtn: { padding: 4 },
  sendCodeBtn: {
    backgroundColor: Colors.light.primary, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, minWidth: 84, alignItems: "center",
  },
  sendCodeBtnDisabled: { backgroundColor: Colors.light.textMuted },
  sendCodeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  verifiedText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#25D366" },
  devBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#EFF6FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: "#BFDBFE",
  },
  devBannerText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#1D4ED8" },
  devCode: { fontFamily: "Inter_700Bold", letterSpacing: 2 },
  otpRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  otpInput: {
    flex: 1, height: 44,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.light.border,
    paddingHorizontal: 14, fontSize: 18, fontFamily: "Inter_600SemiBold",
    color: Colors.light.text, letterSpacing: 6, textAlign: "center",
  },
  verifyBtn: {
    backgroundColor: "#25D366", borderRadius: 10,
    paddingHorizontal: 18, height: 44, alignItems: "center", justifyContent: "center",
  },
  verifyBtnDisabled: { backgroundColor: Colors.light.textMuted },
  verifyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  otpErrorRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  otpErrorText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.error },
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
