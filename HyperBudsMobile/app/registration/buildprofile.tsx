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

        // Avatar Prefill
        const avatarFromMe =
          data?.profile?.avatar ||
          data?.user?.avatar ||
          data?.profile?.photoUrl ||
          null;
        if (avatarFromMe && typeof avatarFromMe === "string") {
          setAvatar(avatarFromMe);
        }

        // Username / display name Prefill
        const u = (data?.profile?.username || "").trim();
        if (u) {
          setUsername(u);
          setUsernameLocked(true); // already set on server; lock editing
        }
        const d = (data?.profile?.displayName || data?.user?.displayName || "").trim();
        if (d) setDisplayName(d);

        // Bio
        if (typeof data?.profile?.bio === "string") setBio(data.profile.bio);

        // Niches (valid only)
        const incomingNiche: string[] = Array.isArray(data?.profile?.niche) ? data.profile.niche : [];
        const valid = incomingNiche.filter((n): n is ValidNiche => (VALID_NICHES as readonly string[]).includes(n));
        if (valid.length) {
          setSelectedNiches(valid.slice(0, 5) as ValidNiche[]);
        }
      } catch (e) {
        console.warn("Failed to load /users/me", e);
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
    <View style={{ flex: 1 }}>
      {/* Top bar + arrows + dots */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={goBackSlide}
          style={[styles.navArrow, currentIndex === 0 && styles.navArrowDim]}
        >
          <Ionicons name="chevron-back" size={22} color="#333" />
        </TouchableOpacity>

        <View style={styles.dots}>
          {[0, 1, 2, 3].map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.activeDot]} />
          ))}
        </View>

        <TouchableOpacity
          onPress={goNextSlide}
          disabled={currentIndex === LAST_INDEX}
          style={[styles.navArrow, currentIndex === LAST_INDEX && styles.navArrowDim]}
        >
          <Ionicons name="chevron-forward" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      <Swiper
        ref={swiperRef}
        loop={false}
        showsPagination={false}
        scrollEnabled={false}
        onIndexChanged={(index) => setCurrentIndex(index)}
      >
        {/* SLIDE 1 - Avatar + Username + Display Name + Bio */}
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            <Image
              source={avatar ? { uri: avatar } : require("../../assets/images/avatar.png")}
              style={styles.avatar}
            />
            <Image source={require("../../assets/images/edit.png")} style={styles.editIcon} />
          </TouchableOpacity>

          <Text style={styles.title}>Build Your Profile</Text>

          {/* Username */}
          <Text style={styles.label}>Username</Text>
          <TextInput
            value={username}
            onChangeText={(v) => setUsername(normalizeUsername(v))}
            placeholder="yourname"
            placeholderTextColor="#888"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!usernameLocked}
            style={[styles.input, usernameLocked && styles.inputDisabled]}
          />
          <Text style={styles.helperText}>
            {usernameLocked
              ? "Your username is set and cannot be changed."
              : "Username cannot be changed later. "}
          </Text>

          {/* Display name */}
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
            placeholderTextColor="#888"
            autoCapitalize="words"
            style={styles.input}
          />

          {/* Bio */}
          <Text style={styles.label}>Short Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            placeholder="Write a short bio..."
            placeholderTextColor="#888"
            style={styles.textArea}
          />

          <TouchableOpacity
            style={[styles.button, savingStepOne && { opacity: 0.7 }]}
            onPress={handleFirstContinue}
            disabled={savingStepOne}
          >
            <LinearGradient colors={["#3B82F6", "#9333EA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
              <Text style={styles.buttonText}>{savingStepOne ? "Saving…" : "Continue"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* SLIDE 2 - Niches */}
        <ScrollView contentContainerStyle={[styles.container, { alignItems: "stretch" }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Choose Your Niche</Text>
          <Text style={styles.subtext}>Pick up to 5 that best describe you</Text>

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
                    {n.charAt(0).toUpperCase() + n.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.subtext, { marginTop: 6 }]}>
            Selected: {selectedNiches.length}/5
          </Text>

          <TouchableOpacity style={styles.button} onPress={() => swiperRef.current?.scrollBy(1, true)}>
            <LinearGradient colors={["#3B82F6", "#9333EA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* SLIDE 3 - Socials */}
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Connect your{"\n"}Socials</Text>
          <View style={{ width: "100%", gap: 12, marginTop: 20 }}>
            {socials.map((item, idx) => (
              <View key={item.key} style={styles.socialRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Image source={item.icon} style={styles.socialIcon} />
                  <Text style={styles.socialLabel}>{item.label}</Text>
                </View>
                <TextInput
                  style={{ flex: 1, marginLeft: 10 }}
                  placeholder={`Your ${item.label} URL or handle`}
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
          <TouchableOpacity style={styles.button} onPress={() => swiperRef.current?.scrollBy(1, true)}>
            <LinearGradient colors={["#3B82F6", "#9333EA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* SLIDE 4 - Done */}
        <View style={styles.container}>
          <Text style={styles.title}>Registration{"\n"}complete</Text>
          <Image source={require("../../assets/images/check.png")} style={styles.checkIcon} />
          <Text style={styles.completeText}>Thank you for{"\n"}registering!</Text>

          <TouchableOpacity
            style={[styles.button, submitting && { opacity: 0.7 }]}
            onPress={submitting ? undefined : handleSubmit}
            disabled={submitting}
          >
            <LinearGradient colors={["#3B82F6", "#9333EA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
              <Text style={styles.buttonText}>{submitting ? "Submitting…" : "Start"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Swiper>
    </View>
  );
}

/* --------------------------------- Styles -------------------------------- */
const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#fff", padding: 20, paddingTop: 35, alignItems: "center" },

  /* Top bar */
  topBar: {
    backgroundColor: "#fff",
    height: 50,
    paddingTop: 25,
    paddingHorizontal: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    zIndex: 999,
    position: "relative",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  navArrowDim: { opacity: 0.4 },
  dots: { flexDirection: "row", gap: 8 },

  /* First slide */
  avatarContainer: { position: "relative", marginBottom: 20 },
  avatar: { width: 120, height: 120, resizeMode: "cover", borderRadius: 60, backgroundColor: "#f3f3f3" },
  editIcon: { position: "absolute", bottom: 13, right: 11, width: 24, height: 24, resizeMode: "contain" },
  title: { fontSize: 24, fontWeight: "bold", color: "#9333EA", marginBottom: 16, textAlign: "center" },
  label: { alignSelf: "flex-start", fontSize: 14, marginBottom: 6, color: "#333", marginTop: 8 },

  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
    color: "#000",
    marginBottom: 4,
  },
  inputDisabled: { backgroundColor: "#f5f5f5", color: "#666" },
  helperText: { alignSelf: "flex-start", fontSize: 12, color: "#666", marginBottom: 8 },

  textArea: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    minHeight: 100,
    marginTop: 2,
    marginBottom: 14,
    textAlignVertical: "top",
    backgroundColor: "#fff",
    color: "#000",
  },

  button: { borderRadius: 10, overflow: "hidden", marginTop: 10, alignSelf: "center" },
  gradient: { paddingVertical: 14, paddingHorizontal: 70, alignItems: "center", borderRadius: 10 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },

  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ccc" },
  activeDot: { backgroundColor: "#A855F7" },

  // Niches chip grid
  subtext: { textAlign: "center", fontSize: 14, color: "#333", marginBottom: 20 },
  nicheWrap: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
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
  nicheText: { color: "#333", fontSize: 14 },
  nicheTextSelected: { color: "#6D28D9", fontWeight: "700" },

  // Socials
  socialRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 12, backgroundColor: "#fff" },
  socialIcon: { width: 22, height: 22, resizeMode: "contain" },
  socialLabel: { fontSize: 15, color: "#000" },

  // Done
  checkIcon: { width: 100, height: 100, marginVertical: 30, resizeMode: "contain" },
  completeText: { fontSize: 16, textAlign: "center", color: "#000", marginBottom: 40 },
});
