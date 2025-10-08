// app/login&signup/buildprofile.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Swiper from "react-native-swiper";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

/** === Change this if your explore screen path is different === */
const EXPLORE_PATH = "/main/explore";

/** === API base (Render prod) === */
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || "").trim() ||
  "https://api-hyperbuds-backend.onrender.com/api/v1";

/** === Allowed niches from backend validation === */
const VALID_NICHES = [
  "beauty","gaming","music","fitness","food","travel","fashion","tech",
  "comedy","education","lifestyle","art","dance","sports","business","health","other",
] as const;
type ValidNiche = (typeof VALID_NICHES)[number];

/** Platforms supported by backend docs */
const SUPPORTED_SOCIALS = ["tiktok","instagram","youtube","twitch","twitter","linkedin"] as const;
type SupportedSocial = (typeof SUPPORTED_SOCIALS)[number];

const USERNAME_REGEX = /^[a-z0-9._]{3,20}$/;

/* --------------------------------- Utils --------------------------------- */
const safeJson = (t: string) => { try { return t ? JSON.parse(t) : {}; } catch { return {}; } };

const fetchWithTimeout = (url: string, options: RequestInit = {}, ms = 45000) =>
  Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("Network timeout")), ms)),
  ]) as Promise<Response>;

async function tryRefreshToken(): Promise<boolean> {
  try {
    const refreshToken = await AsyncStorage.getItem("auth.refreshToken");
    if (!refreshToken) return false;
    const r = await fetchWithTimeout(
      `${API_BASE}/auth/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token: refreshToken }),
      },
      15000
    );
    const txt = await r.text();
    const data = safeJson(txt);
    if (!r.ok) return false;
    const newAccess: string | undefined = data?.accessToken;
    if (!newAccess) return false;
    await AsyncStorage.setItem("auth.accessToken", newAccess);
    await AsyncStorage.setItem("auth.tokenIssuedAt", String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

/** Auth-aware fetch with auto 401 refresh */
async function apiFetch(path: string, init: RequestInit = {}, timeoutMs = 45000) {
  const accessToken = await AsyncStorage.getItem("auth.accessToken");
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
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

/* -------------------------------- Component ------------------------------- */
export default function BuildProfileScreen() {
  const router = useRouter();
  const swiperRef = useRef<Swiper>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const LAST_INDEX = 3;

  const [loadingMe, setLoadingMe] = useState(true);
  const [savingStepOne, setSavingStepOne] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // First slide
  const [avatar, setAvatar] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [usernameLocked, setUsernameLocked] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  // Niches
  const [selectedNiches, setSelectedNiches] = useState<ValidNiche[]>([]);

  // Socials
  const [socials, setSocials] = useState<
    { key: SupportedSocial; label: string; icon: any; value: string }[]
  >([
    { key: "instagram", label: "Instagram", icon: require("../../assets/images/ig.png"), value: "" },
    { key: "tiktok", label: "TikTok", icon: require("../../assets/images/tiktok.png"), value: "" },
    { key: "youtube", label: "YouTube", icon: require("../../assets/images/yt.png"), value: "" },
    { key: "twitch", label: "Twitch", icon: require("../../assets/images/twitch.png"), value: "" },
    { key: "twitter", label: "Twitter (X)", icon: require("../../assets/images/twitter.png"), value: "" },
    { key: "linkedin", label: "LinkedIn", icon: require("../../assets/images/linkedin.png"), value: "" },
  ]);

  /* --------------------- Prefill from /users/me --------------------- */
  useEffect(() => {
    (async () => {
      try {
        setLoadingMe(true);
        const res = await apiFetch("/users/me", { method: "GET" }, 30000);
        const raw = await res.text();
        const data = safeJson(raw);

        // Avatar Prefill (keep avatar if available, but don't auto-fill text inputs)
        const avatarFromMe =
          data?.profile?.avatar ||
          data?.user?.avatar ||
          data?.profile?.photoUrl ||
          null;
        if (avatarFromMe && typeof avatarFromMe === "string") {
          setAvatar(avatarFromMe);
        }

        // --- IMPORTANT: force all text inputs to be blank regardless of server data ---
        // This ensures username, displayName, bio, niches and socials start empty.
        setUsername("");
        setUsernameLocked(false); // allow editing even if server has a username
        setDisplayName("");
        setBio("");
        setSelectedNiches([]);
        // reset socials values to empty strings while preserving icons/labels
        setSocials([
          { key: "instagram", label: "Instagram", icon: require("../../assets/images/ig.png"), value: "" },
          { key: "tiktok", label: "TikTok", icon: require("../../assets/images/tiktok.png"), value: "" },
          { key: "youtube", label: "YouTube", icon: require("../../assets/images/yt.png"), value: "" },
          { key: "twitch", label: "Twitch", icon: require("../../assets/images/twitch.png"), value: "" },
          { key: "twitter", label: "Twitter (X)", icon: require("../../assets/images/twitter.png"), value: "" },
          { key: "linkedin", label: "LinkedIn", icon: require("../../assets/images/linkedin.png"), value: "" },
        ]);
      } catch (e) {
        console.warn("Failed to load /users/me", e);
        // Still ensure inputs are blank if fetch fails
        setUsername("");
        setUsernameLocked(false);
        setDisplayName("");
        setBio("");
        setSelectedNiches([]);
        setSocials([
          { key: "instagram", label: "Instagram", icon: require("../../assets/images/ig.png"), value: "" },
          { key: "tiktok", label: "TikTok", icon: require("../../assets/images/tiktok.png"), value: "" },
          { key: "youtube", label: "YouTube", icon: require("../../assets/images/yt.png"), value: "" },
          { key: "twitch", label: "Twitch", icon: require("../../assets/images/twitch.png"), value: "" },
          { key: "twitter", label: "Twitter (X)", icon: require("../../assets/images/twitter.png"), value: "" },
          { key: "linkedin", label: "LinkedIn", icon: require("../../assets/images/linkedin.png"), value: "" },
        ]);
      } finally {
        setLoadingMe(false);
      }
    })();
  }, []);

  /* ------------------------------- Helpers ------------------------------- */
  const toggleNiche = (n: ValidNiche) =>
    setSelectedNiches((prev) => {
      const has = prev.includes(n);
      if (has) return prev.filter((x) => x !== n) as ValidNiche[];
      if (prev.length >= 5) return prev; // backend max 5
      return [...prev, n] as ValidNiche[];
    });

  const normalizeUsername = (v: string) =>
    v.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9._]/g, "");

  /* ------------------------------- Image picker ------------------------------ */
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Allow photo library access to choose an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: Platform.OS === "ios" ? 0.9 : 0.8,
    });
    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  /* --------------------------- Avatar upload helper -------------------------- */
  async function ensureAvatarUrl(uri: string | null) {
    if (!uri) return undefined;
    if (/^https?:\/\//i.test(uri)) return uri;

    const fd = new FormData();
    fd.append("file", {
      uri,
      name: `avatar-${Date.now()}.jpg`,
      type: "image/jpeg",
    } as any);
    fd.append("type", "avatar"); // per docs

    const r = await apiFetch("/profiles/upload-media", { method: "POST", body: fd }, 60000);
    const text = await r.text();
    const data = safeJson(text);

    if (!r.ok) {
      console.log("Upload error:", text);
      throw new Error(data?.message || `Upload failed (${r.status})`);
    }

    const publicUrl: string | undefined = data?.url || data?.location || data?.publicUrl;
    if (!publicUrl) throw new Error("Upload succeeded but no URL returned by server.");
    return publicUrl;
  }

  /* ------------------------------ Slide nav ------------------------------ */
  const goBackSlide = () => {
    if (currentIndex === 0) {
      router.back();
    } else {
      swiperRef.current?.scrollBy(-1, true);
    }
  };

  const goNextSlide = async () => {
    if (currentIndex === 0) {
      await handleFirstContinue();
      return;
    }
    if (currentIndex < LAST_INDEX) {
      swiperRef.current?.scrollBy(1, true);
    }
  };

  /* ------------------------ Slide 1: validate & pre-save ----------------------- */
  const handleFirstContinue = async () => {
    if (savingStepOne) return;

    // Validate
    const uname = normalizeUsername(username);
    if (!usernameLocked) {
      if (!USERNAME_REGEX.test(uname)) {
        Alert.alert(
          "Username",
          "3–20 characters, lowercase letters, numbers, dot or underscore."
        );
        return;
      }
    }
    if (!displayName.trim()) {
      Alert.alert("Display Name", "Please enter your display name.");
      return;
    }

    setSavingStepOne(true);
    try {
      // Upload avatar first if needed
      const avatarUrl = await ensureAvatarUrl(avatar);

      // Pre-save username & displayName immediately so conflicts show now
      const payload: Record<string, unknown> = {
        displayName: displayName.trim(),
        bio: bio || undefined,
        ...(avatarUrl ? { avatar: avatarUrl } : undefined),
      };
      if (!usernameLocked) payload.username = uname;

      const res = await apiFetch("/profiles/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      }, 45000);

      const txt = await res.text();
      const data = safeJson(txt);
      if (!res.ok) {
        // Expecting server to respond 409 if username exists
        throw new Error(data?.message || `Save failed (${res.status})`);
      }

      if (!usernameLocked) {
        setUsername(uname);
        setUsernameLocked(true); // lock after successful reservation
      }

      swiperRef.current?.scrollBy(1, true);
    } catch (e: any) {
      const msg = String(e?.message || e);
      Alert.alert("Could not save", msg);
    } finally {
      setSavingStepOne(false);
    }
  };

  /* ------------------------------- Final submit ------------------------------ */
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Only upload if user changed avatar since slide 1 (rare)
      const avatarUrl = await ensureAvatarUrl(avatar);

      const niche = selectedNiches.slice(0, 5);

      const socialLinks = socials.reduce((acc, s) => {
        const v = (s.value || "").trim();
        if (v) (acc as any)[s.key] = v;
        return acc;
      }, {} as Record<SupportedSocial, string>);

      const payload: any = {
        displayName: displayName.trim(),
        bio: bio || undefined,
        niche,
        socialLinks,
        ...(avatarUrl ? { avatar: avatarUrl } : undefined),
      };
      // username is already saved/locked on slide 1; do not try to change it here

      const res = await apiFetch("/profiles/me", { method: "PUT", body: JSON.stringify(payload) }, 45000);
      const txt = await res.text();
      const data = safeJson(txt);

      if (!res.ok) {
        throw new Error(data?.message || `Save failed (${res.status})`);
      }

      // mark onboarding done
      await AsyncStorage.setItem("onboarding.completed", "1");

      router.replace(EXPLORE_PATH);
    } catch (e: any) {
      Alert.alert("Submission error", e?.message || "Network request failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------ UI ----------------------------------- */
  if (loadingMe) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12, color: "#333" }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFB" }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Top stepper */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={goBackSlide} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#333" />
          </TouchableOpacity>

          <View style={styles.stepper}>
            <View style={styles.stepItem}>
              {currentIndex >= 0 ? (
                <LinearGradient colors={["#7C3AED", "#3B82F6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.stepCircleGradient}>
                  <Ionicons name="person" size={16} color="#fff" />
                </LinearGradient>
              ) : (
                <View style={styles.stepCircle}>
                  <Ionicons name="person" size={16} color="#9CA3AF" />
                </View>
              )}
              <Text style={[styles.stepLabel, currentIndex >= 0 && styles.stepLabelActive]}>Basic Info</Text>
            </View>

            <View style={styles.stepLine} />

            <View style={styles.stepItem}>
              {currentIndex >= 1 ? (
                <LinearGradient colors={["#7C3AED", "#3B82F6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.stepCircleGradient}>
                  <Ionicons name="pencil" size={16} color="#fff" />
                </LinearGradient>
              ) : (
                <View style={styles.stepCircle}>
                  <Ionicons name="pencil" size={16} color="#9CA3AF" />
                </View>
              )}
              <Text style={[styles.stepLabel, currentIndex >= 1 && styles.stepLabelActive]}>About You</Text>
            </View>

            <View style={styles.stepLine} />

            <View style={styles.stepItem}>
              {currentIndex >= 2 ? (
                <LinearGradient colors={["#7C3AED", "#3B82F6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.stepCircleGradient}>
                  <Ionicons name="link" size={16} color="#fff" />
                </LinearGradient>
              ) : (
                <View style={styles.stepCircle}>
                  <Ionicons name="link" size={16} color="#9CA3AF" />
                </View>
              )}
              <Text style={[styles.stepLabel, currentIndex >= 2 && styles.stepLabelActive]}>Social Links</Text>
            </View>
          </View>

          <View style={{ width: 44 }} />
        </View>

        <Swiper
          ref={swiperRef}
          loop={false}
          showsPagination={false}
          scrollEnabled={false}
          onIndexChanged={(index) => setCurrentIndex(index)}
        >
          {/* SLIDE 1 */}
          <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 140 }]} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Add Your Profile Picture</Text>
            <Text style={styles.sectionSub}>This will be your public photo (Max 5MB)</Text>

            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} activeOpacity={0.9}>
              <View style={styles.avatarShadow}>
                <Image
                  source={avatar ? { uri: avatar } : require("../../assets/images/avatar.png")}
                  style={styles.avatar}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.photoBtn} onPress={pickImage} activeOpacity={0.9}>
              <LinearGradient colors={["#A855F7", "#3B82F6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.photoGradient}>
                <Ionicons name="camera" size={18} color="#fff" />
                <Text style={styles.photoBtnText}>Choose Photo</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.bigHeading}>BASIC INFORMATION</Text>
            <Text style={styles.helpSmall}>Choose your username and display name</Text>

            <View style={{ width: "100%", marginTop: 8 }}>
            <Text style={styles.label}>Username</Text>
              <TextInput
                value={username}
                onChangeText={(v) => setUsername(normalizeUsername(v))}
                //placeholder="Coolcreator123"
                placeholderTextColor="#9BA4B1"
                autoCapitalize="none"
                autoCorrect={false}
                editable={true}
                style={[styles.input]}
              />
              <Text style={styles.helperText}>
                {usernameLocked
                  ? "Your username is set and cannot be changed."
                  : "Username cannot be changed later."}
              </Text>

              <Text style={styles.label}>Display Name</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                //placeholder="Cool Creator"
                placeholderTextColor="#9BA4B1"
                autoCapitalize="words"
                style={styles.input}
              />
            </View>

            {/* Bottom-right continue for slide 1 */}
            <TouchableOpacity
              style={[styles.bottomCta, savingStepOne && { opacity: 0.7 }]}
              onPress={handleFirstContinue}
              disabled={savingStepOne}
            >
              <LinearGradient colors={["#A855F7", "#3B82F6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaInnerSmall}>
                <Text style={styles.ctaTextSmall}>{savingStepOne ? "Saving…" : "Continue"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>

          {/* SLIDE 2 */}
          <ScrollView
            contentContainerStyle={[styles.container, { alignItems: "stretch", paddingBottom: 100 }]}  // ** CHANGED **
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>Tell Us About You</Text>
            <Text style={styles.sectionSub}>Share your story and interests</Text>

            <Text style={[styles.label, { marginTop: 8 }]}>Bio</Text>
            <View style={styles.bioBox}>
              <TextInput
                value={bio}
                onChangeText={(t) => setBio(t.slice(0, 500))}
                multiline
                numberOfLines={6}
                placeholder="Tell us about yourself and your content"
                placeholderTextColor="#9BA4B1"
                style={styles.textArea}
              />
            </View>
            <Text style={styles.charCount}>{bio.length}/500 characters</Text>

            <Text style={[styles.label, { marginTop: 10 }]}>Select your niches (max 5)</Text>
            <View style={styles.nicheWrap}>
              {VALID_NICHES.map((n) => {
                const selected = selectedNiches.includes(n);
                return (
                  <TouchableOpacity
                    key={n}
                    style={[styles.nicheChip, selected && styles.nicheChipSelected]}
                    onPress={() => toggleNiche(n)}
                  >
                    <Text style={[styles.nicheText, selected && styles.nicheTextSelected]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.helperSmall}>{selectedNiches.length}/5 niches selected</Text>

            {/* Bottom-right continue for slide 2 */}
            <TouchableOpacity style={styles.bottomCta} onPress={() => swiperRef.current?.scrollBy(1, true)}>
              <LinearGradient colors={["#A855F7", "#3B82F6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaInnerSmall}>
                <Text style={styles.ctaTextSmall}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>

          {/* SLIDE 3 */}
          <ScrollView contentContainerStyle={[styles.container, { alignItems: "stretch", paddingBottom: 140 }]} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Connect Your Socials</Text>
            <Text style={styles.sectionSub}>Link your profiles to showcase your work</Text>

            <View style={{ marginTop: 16, width: "100%" }}>
              {socials.map((item, idx) => (
                <View key={item.key} style={styles.socialRow}>
                  <View style={styles.socialLeft}>
                    <Image source={item.icon} style={styles.socialIcon} />
                    <Text style={styles.socialLabel}>{item.label}</Text>
                  </View>
                  <TextInput
                    style={styles.socialInput}
                    placeholder={`https:// ${item.label.toLowerCase()}.com/@username`}
                    placeholderTextColor="#9BA4B1"
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

            {/* Bottom-right finish */}
            <TouchableOpacity
              style={[styles.bottomCta, submitting && { opacity: 0.7 }]}
              onPress={submitting ? undefined : handleSubmit}
              disabled={submitting}
            >
              <LinearGradient colors={["#A855F7", "#3B82F6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaInnerSmall}>
                <Text style={styles.ctaTextSmall}>{submitting ? "Submitting…" : "Continue"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Swiper>
      </SafeAreaView>
    </View>
  );
}

/* --------------------------------- Styles -------------------------------- */
const styles = StyleSheet.create({
  // base
  container: { flexGrow: 1, backgroundColor: "#F8FAFB", padding: 20, paddingTop: 10, alignItems: "center" },

  /* Top stepper */
  topBar: {
    height: 88,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    backgroundColor: "transparent",
    marginTop: -15,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -15,
  },
  stepper: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  stepItem: { alignItems: "center", width: 86 },
  stepCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
  },
  stepCircleGradient: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
  },
  stepLabel: { marginTop: 6, fontSize: 12, color: "#9CA3AF" },
  stepLabelActive: { color: "#8B5CF6", fontWeight: "700" },
  stepLine: { width: 18, height: 2, backgroundColor: "#E6E9F2", marginHorizontal: -6 },

  /* Avatar area */
  sectionTitle: { fontSize: 22, fontWeight: "700", color: "#6D28D9", marginTop: -10, textAlign: "center" },
  sectionSub: { fontSize: 12, color: "#9CA3AF", marginTop: 6, textAlign: "center" },

  avatarContainer: { marginTop: 18, marginBottom: 8 },
  avatarShadow: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 8,
    overflow: "hidden",
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    resizeMode: "cover",
    backgroundColor: "#F3F4F6",
  },

  // Slimmer choose-photo button
  photoBtn: { marginTop: 12, marginBottom: 8 },
  photoGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  photoBtnText: { color: "#fff", marginLeft: 8, fontWeight: "600" },

  bigHeading: { fontSize: 16, color: "#6D28D9", fontWeight: "700", marginTop: 14, marginBottom: 6, textAlign: "center" },
  helpSmall: { fontSize: 12, color: "#6B7280", marginBottom: 12 },

  label: { alignSelf: "flex-start", fontSize: 13, marginBottom: 6, color: "#374151", marginTop: 6 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E6E6EA",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
    color: "#111827",
    marginBottom: 6,
  },
  inputDisabled: { backgroundColor: "#F3F4F6", color: "#9CA3AF" },
  helperText: { alignSelf: "flex-start", fontSize: 12, color: "#9CA3AF", marginBottom: 8 },

  textArea: {
    width: "100%",
    padding: 12,
    fontSize: 14,
    minHeight: 110,
    color: "#111827",
  },
  bioBox: {
    borderWidth: 1,
    borderColor: "#E6E6EA",
    borderRadius: 10,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  charCount: { alignSelf: "flex-end", color: "#9CA3AF", fontSize: 12, marginTop: 6 },

  /* niches — updated / compressed */  
  nicheWrap: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,         // ** CHANGED **
  },
  nicheChip: {
    paddingVertical: 6,      // ** CHANGED **
    paddingHorizontal: 10,   // ** CHANGED **
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E6E6EA",
    backgroundColor: "#fff",
    marginRight: 6,          // ** CHANGED **
    marginBottom: 6,         // ** CHANGED **
  },
  nicheChipSelected: {
    borderColor: "#D6BBFF",
    backgroundColor: "#F5F3FF",
  },
  nicheText: { color: "#374151", fontSize: 13 },        // ** CHANGED **
  nicheTextSelected: { color: "#6D28D9", fontWeight: "700" },
  helperSmall: { color: "#9CA3AF", fontSize: 13, marginTop: 6 },

  /* location removed (styles kept) */
  locationRow: { width: "100%", flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 8 },
  smallInputWrap: { flex: 1 },
  smallLabel: { fontSize: 12, color: "#374151", marginBottom: 6 },
  smallInput: {
    borderWidth: 1,
    borderColor: "#E6E6EA",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    color: "#111827",
  },

  /* socials */
  socialRow: { width: "100%", flexDirection: "row", alignItems: "center", marginBottom: 12 },
  socialLeft: { width: 120, flexDirection: "row", alignItems: "center" },
  socialIcon: { width: 28, height: 28, resizeMode: "contain" },
  socialLabel: { marginLeft: 10, fontSize: 14, color: "#111827", width: 70 },
  socialInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E6E6EA",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    color: "#111827",
  },

  /* Continue CTA used previously: replaced by small bottom-right CTA */
  cta: { borderRadius: 10, overflow: "hidden", marginTop: 16, alignSelf: "center", width: "100%" },
  ctaInner: { paddingVertical: 14, alignItems: "center", borderRadius: 10 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  /* smaller pill CTA anchored bottom-right */
  bottomCta: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 120,
    borderRadius: 28,
    overflow: "hidden",
  },
  ctaInnerSmall: { paddingVertical: 10, alignItems: "center", borderRadius: 28 },
  ctaTextSmall: { color: "#fff", fontSize: 14, fontWeight: "700" },

  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ccc" },
  activeDot: { backgroundColor: "#A855F7" },

  /* done */
  checkIcon: { width: 100, height: 100, marginVertical: 30, resizeMode: "contain" },
  completeText: { fontSize: 16, textAlign: "center", color: "#000", marginBottom: 40 },

  /* misc */
  eyeButton: {
    position: "absolute",
    right: 14,
    justifyContent: "center",
    alignItems: "center",
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
