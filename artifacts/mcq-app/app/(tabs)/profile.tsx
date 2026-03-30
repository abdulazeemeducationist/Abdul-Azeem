import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
import CountryCodePicker, { DEFAULT_COUNTRY, detectCountry, type Country } from "@/components/CountryCodePicker";

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
  const { user, signOut, updateProfile, changePassword, updateProfilePicture } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  // Sign out modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Edit profile modal
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCountry, setEditCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [editLocalNumber, setEditLocalNumber] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Change password modal
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);

  // Picture upload / remove
  const [uploadingPic, setUploadingPic] = useState(false);
  const [removingPic, setRemovingPic] = useState(false);
  const [picError, setPicError] = useState("");

  const handleRemovePhoto = async () => {
    setRemovingPic(true);
    setPicError("");
    try {
      await updateProfilePicture("");
    } catch (e: any) {
      setPicError(e?.message || "Failed to remove photo.");
    } finally {
      setRemovingPic(false);
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/auth/signin");
    } catch {
      setSigningOut(false);
      setShowConfirm(false);
    }
  };

  const openEditProfile = () => {
    setEditName(user?.name ?? "");
    if (user?.whatsappNumber) {
      const { country, local } = detectCountry(user.whatsappNumber);
      setEditCountry(country);
      setEditLocalNumber(local);
    } else {
      setEditCountry(DEFAULT_COUNTRY);
      setEditLocalNumber("");
    }
    setProfileError("");
    setProfileSuccess(false);
    setShowEditProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) { setProfileError("Name is required"); return; }
    setSavingProfile(true);
    setProfileError("");
    try {
      const fullWhatsapp = editLocalNumber.trim()
        ? editCountry.code + editLocalNumber.replace(/\D/g, "").replace(/^0+/, "")
        : "";
      await updateProfile(editName.trim(), fullWhatsapp);
      setProfileSuccess(true);
      setTimeout(() => { setShowEditProfile(false); setProfileSuccess(false); }, 1000);
    } catch (e: any) {
      setProfileError(e.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const openChangePassword = () => {
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    setPwdError(""); setPwdSuccess(false);
    setShowChangePassword(true);
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) { setPwdError("All fields are required"); return; }
    if (newPwd.length < 6) { setPwdError("New password must be at least 6 characters"); return; }
    if (newPwd !== confirmPwd) { setPwdError("Passwords do not match"); return; }
    setSavingPwd(true);
    setPwdError("");
    try {
      await changePassword(currentPwd, newPwd);
      setPwdSuccess(true);
      setTimeout(() => { setShowChangePassword(false); setPwdSuccess(false); }, 1000);
    } catch (e: any) {
      setPwdError(e.message || "Failed to change password");
    } finally {
      setSavingPwd(false);
    }
  };

  const handlePickImage = async () => {
    setPicError("");
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setPicError("Gallery permission denied. Please allow access in your device settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setUploadingPic(true);
    try {
      const resized = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 300, height: 300 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (!resized.base64) {
        setPicError("Could not process image. Please try a different photo.");
        return;
      }
      const sizeKb = Math.round((resized.base64.length * 3) / 4 / 1024);
      if (sizeKb > 500) {
        setPicError(`Image is still too large (${sizeKb} KB). Please choose a smaller photo.`);
        return;
      }
      const dataUri = `data:image/jpeg;base64,${resized.base64}`;
      await updateProfilePicture(dataUri);
    } catch (e: any) {
      setPicError(e?.message || "Failed to upload picture. Please try again.");
    } finally {
      setUploadingPic(false);
    }
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { paddingTop: topPad }]}
        contentContainerStyle={{ paddingBottom: isWeb ? 34 + 84 : 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <Pressable style={styles.avatarPressable} onPress={handlePickImage} disabled={uploadingPic || removingPic}>
              {user?.profilePicture ? (
                <Image source={{ uri: user.profilePicture }} style={styles.avatarFill} contentFit="cover" />
              ) : (
                <View style={styles.avatarFill}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              <View style={styles.cameraOverlay}>
                {uploadingPic
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Ionicons name="camera" size={16} color="#FFF" />}
              </View>
            </Pressable>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {user?.whatsappNumber ? (
            <View style={styles.whatsappRow}>
              <Ionicons name="logo-whatsapp" size={13} color="#25D366" />
              <Text style={styles.whatsappText}>+{user.whatsappNumber}</Text>
            </View>
          ) : null}
          {user?.role === "admin" && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>Admin</Text>
            </View>
          )}
          {picError ? (
            <View style={styles.picErrorBox}>
              <Ionicons name="alert-circle" size={14} color={Colors.light.error} />
              <Text style={styles.picErrorText}>{picError}</Text>
            </View>
          ) : null}
        </View>

        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuGroup}>
            <MenuRow icon="person-outline" label="Edit Profile" onPress={openEditProfile} />
            <View style={styles.divider} />
            <MenuRow icon="lock-closed-outline" label="Change Password" onPress={openChangePassword} />
            <View style={styles.divider} />
            <MenuRow icon="image-outline" label="Update Profile Picture" onPress={handlePickImage} />
            {user?.profilePicture ? (
              <>
                <View style={styles.divider} />
                <MenuRow icon="trash-outline" label="Remove Photo" onPress={handleRemovePhoto} color={Colors.light.error} />
              </>
            ) : null}
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
            onPress={() => setShowConfirm(true)}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.light.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>

        <Text style={styles.versionText}>MCQ Pro v1.0.0</Text>
      </ScrollView>

      {/* Sign out modal */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconBox, { backgroundColor: Colors.light.error + "14" }]}>
              <Ionicons name="log-out-outline" size={30} color={Colors.light.error} />
            </View>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalMsg}>Are you sure you want to sign out?</Text>
            <View style={styles.modalActions}>
              <Pressable style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.8 : 1 }]} onPress={() => setShowConfirm(false)} disabled={signingOut}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.dangerBtn, { opacity: pressed || signingOut ? 0.8 : 1 }]} onPress={handleSignOut} disabled={signingOut}>
                <Text style={styles.dangerBtnText}>{signingOut ? "Signing out…" : "Sign Out"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit profile modal */}
      <Modal visible={showEditProfile} transparent animationType="slide" onRequestClose={() => setShowEditProfile(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable onPress={() => setShowEditProfile(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={Colors.light.textMuted} />
              </Pressable>
            </View>
            {profileError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={14} color={Colors.light.error} />
                <Text style={styles.errorText}>{profileError}</Text>
              </View>
            ) : null}
            {profileSuccess ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                <Text style={styles.successText}>Profile updated!</Text>
              </View>
            ) : null}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={17} color={Colors.light.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your full name"
                  placeholderTextColor={Colors.light.textMuted}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>WhatsApp Number</Text>
              <View style={styles.inputWrapper}>
                <CountryCodePicker
                  selected={editCountry}
                  onSelect={setEditCountry}
                />
                <TextInput
                  style={styles.input}
                  value={editLocalNumber}
                  onChangeText={setEditLocalNumber}
                  placeholder="3001234567"
                  placeholderTextColor={Colors.light.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, { opacity: pressed || savingProfile ? 0.85 : 1 }]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Save Changes</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Change password modal */}
      <Modal visible={showChangePassword} transparent animationType="slide" onRequestClose={() => setShowChangePassword(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Pressable onPress={() => setShowChangePassword(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={Colors.light.textMuted} />
              </Pressable>
            </View>
            {pwdError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={14} color={Colors.light.error} />
                <Text style={styles.errorText}>{pwdError}</Text>
              </View>
            ) : null}
            {pwdSuccess ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                <Text style={styles.successText}>Password changed successfully!</Text>
              </View>
            ) : null}
            {(["Current Password", "New Password", "Confirm New Password"] as const).map((lbl, i) => {
              const val = [currentPwd, newPwd, confirmPwd][i];
              const setVal = [setCurrentPwd, setNewPwd, setConfirmPwd][i];
              const show = [showCurrentPwd, showNewPwd, showConfirmPwd][i];
              const setShow = [setShowCurrentPwd, setShowNewPwd, setShowConfirmPwd][i];
              return (
                <View key={lbl} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{lbl}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={17} color={Colors.light.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={val}
                      onChangeText={setVal}
                      placeholder={lbl}
                      placeholderTextColor={Colors.light.textMuted}
                      secureTextEntry={!show}
                      autoCapitalize="none"
                    />
                    <Pressable onPress={() => setShow(!show)} style={styles.eyeBtn}>
                      <Ionicons name={show ? "eye" : "eye-off"} size={17} color={Colors.light.textMuted} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, { opacity: pressed || savingPwd ? 0.85 : 1 }]}
              onPress={handleChangePassword}
              disabled={savingPwd}
            >
              {savingPwd ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Change Password</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 12 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.light.text },

  avatarSection: { alignItems: "center", paddingVertical: 24, gap: 6 },
  avatarWrap: { position: "relative", marginBottom: 4, alignSelf: "center", width: 90, height: 90 },
  avatarPressable: {
    width: 90, height: 90, borderRadius: 45, overflow: "hidden",
  },
  avatarFill: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.light.primary, alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#FFF" },
  cameraOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: 28, backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "center",
  },
  removeOverlay: {
    position: "absolute", top: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.light.error,
    borderWidth: 2, borderColor: Colors.light.background,
    alignItems: "center", justifyContent: "center",
    zIndex: 10,
  },
  userName: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  userEmail: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  whatsappRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  whatsappText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  roleBadge: { backgroundColor: Colors.light.primary + "18", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  roleText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },
  picErrorBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.light.error + "12", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 4, maxWidth: 300 },
  picErrorText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.error, lineHeight: 18 },

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
    gap: 8, padding: 16, backgroundColor: Colors.light.error + "12", borderRadius: 14,
  },
  signOutText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.light.error },
  versionText: { textAlign: "center", color: Colors.light.textMuted, fontSize: 12, fontFamily: "Inter_400Regular", paddingVertical: 16 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: {
    width: "100%", maxWidth: 360, backgroundColor: Colors.light.card,
    borderRadius: 20, padding: 24, gap: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalIconBox: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  modalMsg: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center" },
  modalActions: { flexDirection: "row", gap: 10 },

  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.error + "12", borderRadius: 10, padding: 10 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.error },
  successBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F0FDF4", borderRadius: 10, padding: 10 },
  successText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#16A34A" },

  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border,
    paddingHorizontal: 12, height: 48,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.light.text },
  eyeBtn: { padding: 4 },

  primaryBtn: { backgroundColor: Colors.light.primary, borderRadius: 14, height: 50, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.light.border, alignItems: "center", justifyContent: "center",
  },
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.textSecondary },
  dangerBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: Colors.light.error, alignItems: "center", justifyContent: "center" },
  dangerBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});
