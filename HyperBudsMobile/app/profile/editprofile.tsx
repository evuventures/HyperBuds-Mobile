// app/profile/editprofile.tsx
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

/** API base */
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || "").trim() ||
  "https://api-hyperbuds-backend.onrender.com/api/v1";

/* ----------------------------- Allowed niches ----------------------------- */
const VALID_NICHES = [
  "beauty","gaming","music","fitness","food","travel","fashion","tech",
  "comedy","education","lifestyle","art","dance","sports","business","health","other",
] as const;

type ValidNiche = typeof VALID_NICHES[number];

/* --------------------------------- Types --------------------------------- */
type ProfileModel = {
  _id: string;
  userId: string;
  username?: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  niche?: string[];
  socialLinks?: {
    tiktok?: string;
    instagram?: string;
    youtube?: string;
    twitch?: string;
    twitter?: string;
    linkedin?: string;
  };
};

type UsersMeResponse = {
  user: {
    _id: string;
    email: string;
    role: string;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  profile: ProfileModel;
};

/* --------------------------------- Utils --------------------------------- */
const safeJson = (t: string) => {
  try {
    return t ? JSON.parse(t) : {};
  } catch {
    return {};
  }
};

const fetchWithTimeout = (url: string, options: RequestInit = {}, ms = 30000) =>
  Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), ms)
    ),
  ]) as Promise<Response>;

async function tryRefreshToken(): Promise<boolean> {
  try {
    const refreshToken = await AsyncStorage.getItem("auth.refreshToken");
    if (!refreshToken) return false;
    const r = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token: refreshToken }),
    }, 15000);
    if (!r.ok) return false;
    const data = safeJson(await r.text());
    const newAccess: string | undefined = data?.accessToken;
    if (!newAccess) return false;
    await AsyncStorage.setItem("auth.accessToken", newAccess);
    await AsyncStorage.setItem("auth.tokenIssuedAt", String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

/** Auth-aware fetch */
async function apiFetch(path: string, init: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const accessToken = await AsyncStorage.getItem("auth.accessToken");
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(init.headers as Record<string, string>),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
  const go = () => fetchWithTimeout(`${API_BASE}${path}`, { ...init, headers }, timeoutMs);
  let res = await go();
  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newAccess = await AsyncStorage.getItem("auth.accessToken");
      const headers2: Record<string, string> = { ...headers };
      if (newAccess) headers2.Authorization = `Bearer ${newAccess}`;
      res = await fetchWithTimeout(`${API_BASE}${path}`, { ...init, headers: headers2 }, timeoutMs);
    }
  }
  return res;
}

/** Keep uploads small & fast. */
async function processAvatar(uri: string) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 640 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

/* ----------------------------- Component ----------------------------- */
export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [displayName, setDisplayName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [bio, setBio] = useState("");

  // Avatar (local or remote URL)
  const [avatar, setAvatar] = useState<string | null>(null);

  // Niches
  const [selectedNiches, setSelectedNiches] = useState<ValidNiche[]>([]);

  // Socials
  const [socials, setSocials] = useState([
    { key: "tiktok", label: "TikTok", icon: require("../../assets/images/tiktok.png"), value: "" },
    { key: "instagram", label: "Instagram", icon: require("../../assets/images/ig.png"), value: "" },
    { key: "youtube", label: "YouTube", icon: require("../../assets/images/yt.png"), value: "" },
    { key: "twitch", label: "Twitch", icon: require("../../assets/images/twitch.png"), value: "" },
    { key: "twitter", label: "Twitter (X)", icon: require("../../assets/images/twitter.png"), value: "" },
    { key: "linkedin", label: "LinkedIn", icon: require("../../assets/images/linkedin.png"), value: "" },
  ]);

  /* ------------------------------ Load profile ------------------------------ */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch("/users/me", { method: "GET" }, 30000);
        const data: UsersMeResponse = safeJson(await res.text());
        if (!res.ok)
          throw new Error((data as any)?.message || `Failed to load profile (${res.status})`);

        const p = data?.profile || ({} as ProfileModel);
        setDisplayName(p.displayName || "");
        setUsername(p.username || "");
        setBio(p.bio || "");
        setAvatar(p.avatar || null);

        const incomingRaw = Array.isArray(p.niche) ? p.niche : [];
        const valid = incomingRaw
          .filter((n): n is ValidNiche => (VALID_NICHES as readonly string[]).includes(n))
          .slice(0, 5) as ValidNiche[];
        setSelectedNiches(valid);

        const s = p.socialLinks || {};
        setSocials(prev =>
          prev.map(it => ({ ...it, value: (s as any)[it.key] ? String((s as any)[it.key]) : "" }))
        );
      } catch (e: any) {
        Alert.alert("Load error", e?.message || "Could not load your profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ------------------------------ Pickers ------------------------------ */
  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Allow photo library access to choose an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled) return;
    setAvatar(result.assets[0].uri);
  };

  /** Upload avatar with proper React Native file handling */
  async function uploadAvatarIfLocal(uri: string | null): Promise<string | null> {
    if (!uri) return null;
    // If already a remote URL, return as-is
    if (/^https?:\/\//i.test(uri)) return uri;

    try {
      console.log("[uploadAvatarIfLocal] Starting upload for:", uri);
      
      const processed = await processAvatar(uri);
      console.log("[uploadAvatarIfLocal] Image processed:", processed);

      // For React Native, we need to use FileSystem to upload
      const accessToken = await AsyncStorage.getItem("auth.accessToken");
      
      const uploadResult = await FileSystem.uploadAsync(
        `${API_BASE}/profiles/upload-media`,
        processed,
        {
          fieldName: 'file',
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          parameters: {
            type: 'avatar'
          }
        }
      );

      console.log("[uploadAvatarIfLocal] Upload response status:", uploadResult.status);
      console.log("[uploadAvatarIfLocal] Upload response body:", uploadResult.body);

      if (uploadResult.status !== 200 && uploadResult.status !== 201) {
        const data = safeJson(uploadResult.body);
        const errorMsg = data?.message || uploadResult.body || `Upload failed (${uploadResult.status})`;
        console.error("[uploadAvatarIfLocal] Upload failed:", errorMsg);
        throw new Error(errorMsg);
      }

      const data = safeJson(uploadResult.body);
      
      // Check multiple possible response fields
      const url: string | undefined = 
        data?.url || 
        data?.location || 
        data?.publicUrl || 
        data?.avatar ||
        data?.data?.url ||
        data?.data?.location;
      
      if (!url) {
        console.error("[uploadAvatarIfLocal] No URL in response:", data);
        throw new Error("No URL returned from upload");
      }
      
      console.log("[uploadAvatarIfLocal] Upload successful:", url);
      return url;
      
    } catch (error: any) {
      console.error("[uploadAvatarIfLocal] Error:", error);
      throw new Error(`Error uploading media: ${error.message}`);
    }
  }

  /** Save profile helper: prefers PATCH /profiles/me, falls back to PUT */
  async function saveProfile(payload: Partial<ProfileModel>) {
    console.log("[saveProfile] Attempting PATCH /profiles/me");
    let res = await apiFetch("/profiles/me", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }, 30000);

    if (!res.ok && (res.status === 404 || res.status === 405)) {
      console.log("[saveProfile] PATCH failed, trying PUT");
      res = await apiFetch("/profiles/me", {
        method: "PUT",
        body: JSON.stringify(payload)
      }, 30000);
    }
    return res;
  }

  /* ------------------------------ Save ------------------------------ */
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      console.log("[handleSave] Starting save process");
      console.log("[handleSave] Current avatar:", avatar);
      
      // Upload avatar if it's a local file
      let uploadedAvatarUrl: string | null = null;
      if (avatar && !/^https?:\/\//i.test(avatar)) {
        console.log("[handleSave] Avatar is local, uploading...");
        uploadedAvatarUrl = await uploadAvatarIfLocal(avatar);
        console.log("[handleSave] Avatar uploaded:", uploadedAvatarUrl);
      } else if (avatar) {
        console.log("[handleSave] Avatar is already remote URL");
        uploadedAvatarUrl = avatar;
      }

      const avatarUrlToSend = uploadedAvatarUrl || undefined;

      const niche = (Array.isArray(selectedNiches) ? selectedNiches : [])
        .filter((n): n is ValidNiche => (VALID_NICHES as readonly string[]).includes(n))
        .slice(0, 5);

      const socialLinks = socials.reduce((acc, s) => {
        if (s.value?.trim()) (acc as any)[s.key] = s.value.trim();
        return acc;
      }, {} as NonNullable<ProfileModel["socialLinks"]>);

      const payload: Partial<ProfileModel> = {
        displayName: displayName || undefined,
        username: username || undefined,
        bio,
        niche,
        socialLinks,
        ...(avatarUrlToSend ? { avatar: avatarUrlToSend } : {}),
      };

      console.log("[handleSave] Saving profile with payload:", payload);

      const res = await saveProfile(payload);
      const d = safeJson(await res.text());
      if (!res.ok) throw new Error(d?.message || `Save failed (${res.status})`);

      console.log("[handleSave] Profile saved successfully");

      Alert.alert("Saved", "Your profile was updated.", [
        { text: "OK", onPress: () => router.push("/profile/profile") },
      ]);
    } catch (e: any) {
      console.error("[handleSave] Save error:", e);
      Alert.alert("Save failed", e?.message || "Network request failed");
    } finally {
      setSaving(false);
    }
  };

  /* --------------------------------- UI --------------------------------- */
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#9333EA" />
        <Text style={{ marginTop: 12, color: "#333" }}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Edit Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Avatar with generic placeholder */}
          <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={50} color="#9333EA" />
              </View>
            )}
            <View style={styles.editIconContainer}>
              <Ionicons name="camera" size={18} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Display Name / Username */}
          <Text style={styles.sectionTitle}>Name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
            placeholderTextColor="#666"
            style={styles.input}
          />
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Username (unique)"
            placeholderTextColor="#666"
            autoCapitalize="none"
            style={styles.input}
          />

          {/* Bio */}
          <Text style={styles.sectionTitle}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself…"
            placeholderTextColor="#666"
            style={styles.textArea}
            multiline
            numberOfLines={4}
          />

          {/* Niches */}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Niches</Text>
          <Text style={styles.subtext}>Pick up to 5</Text>
          <View style={styles.nicheWrap}>
            {VALID_NICHES.map((n) => {
              const selected = selectedNiches.includes(n);
              return (
                <TouchableOpacity
                  key={n}
                  style={[styles.nicheChip, selected && styles.nicheChipSelected]}
                  onPress={() => {
                    setSelectedNiches((prev) => {
                      const has = prev.includes(n);
                      if (has) return prev.filter((x) => x !== n) as ValidNiche[];
                      if (prev.length >= 5) return prev;
                      return [...prev, n] as ValidNiche[];
                    });
                  }}
                >
                  <Text style={[styles.nicheText, selected && styles.nicheTextSelected]}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Socials */}
          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Socials</Text>
          <View style={{ width: "100%", gap: 12 }}>
            {socials.map((item, idx) => (
              <View key={item.key} style={styles.socialRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Image source={item.icon} style={styles.socialIcon} />
                  <Text style={styles.socialLabel}>{item.label}</Text>
                </View>
                <TextInput
                  style={{ flex: 1, marginLeft: 10 }}
                  placeholder={`Your ${item.label} URL or handle`}
                  placeholderTextColor="#666"
                  value={item.value}
                  onChangeText={(text) => {
                    const copy = [...socials];
                    copy[idx].value = text;
                    setSocials(copy);
                  }}
                  autoCapitalize="none"
                />
              </View>
            ))}
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.button, saving && { opacity: 0.7 }]}
            disabled={saving}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#3B82F6", "#9333EA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText} numberOfLines={1}>
                  Save Changes
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* --------------------------------- Styles -------------------------------- */
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 16,
    alignItems: "center",
    backgroundColor: "#fff"
  },
  topBar: {
    height: 56,
    paddingTop: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333"
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarContainer: {
    position: "relative",
    marginTop: 16,
    marginBottom: 18,
    alignSelf: "center"
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    resizeMode: "cover",
    backgroundColor: "#f3f3f3",
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F5F3FF",
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  editIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#9333EA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  sectionTitle: {
    alignSelf: "flex-start",
    fontSize: 18,
    fontWeight: "700",
    color: "#9333EA",
    marginTop: 6,
    marginBottom: 8
  },
  subtext: {
    alignSelf: "flex-start",
    fontSize: 13,
    color: "#555",
    marginBottom: 8
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  textArea: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    minHeight: 100,
    textAlignVertical: "top",
    backgroundColor: "#fff",
  },
  nicheWrap: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  nicheChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  nicheChipSelected: {
    borderColor: "#9333EA",
    backgroundColor: "#F5F3FF",
  },
  nicheText: {
    color: "#333",
    fontSize: 14
  },
  nicheTextSelected: {
    color: "#6D28D9",
    fontWeight: "700"
  },
  socialRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
  },
  socialIcon: {
    width: 22,
    height: 22,
    resizeMode: "contain"
  },
  socialLabel: {
    fontSize: 15,
    color: "#000"
  },
  button: {
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 16,
    alignSelf: "center"
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 70,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    minHeight: 50,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600"
  },
});