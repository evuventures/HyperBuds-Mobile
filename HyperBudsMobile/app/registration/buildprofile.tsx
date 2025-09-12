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
import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Swiper from "react-native-swiper";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

/* ------------------------------ Static data ------------------------------ */
const purposeOptions = [
  { key: "collab", label: "Collaborate with Others", icon: require("../../assets/images/collab.png") },
  { key: "learn", label: "Learn New Skills with AI Assistance", icon: require("../../assets/images/learn.png") },
  { key: "friends", label: "Meet New Friends", icon: require("../../assets/images/friends.png") },
  { key: "brainstorm", label: "Use AI to Brainstorm / Co-create", icon: require("../../assets/images/AI.png") },
  { key: "feedback", label: "Get Feedback on my Work", icon: require("../../assets/images/feedback.png") },
  { key: "idea", label: "Build or Pitch an Idea with Others", icon: require("../../assets/images/idea.png") },
  { key: "monetize", label: "Monetize my Content or Services", icon: require("../../assets/images/money.png") },
  { key: "livestream", label: "Livestream Using AI Tools", icon: require("../../assets/images/live.png") },
  { key: "other", label: "Other / Unsure", icon: require("../../assets/images/question.png") },
];

const collabTypes = [
  { key: "duet", label: "Live Duet", icon: require("../../assets/images/duet.png") },
  { key: "podcast", label: "Podcast", icon: require("../../assets/images/podcast.png") },
  { key: "interview", label: "Interview", icon: require("../../assets/images/interview.png") },
];

/** Platforms supported by backend docs */
const SUPPORTED_SOCIALS = ["tiktok","instagram","youtube","twitch","twitter","linkedin"] as const;
type SupportedSocial = (typeof SUPPORTED_SOCIALS)[number];

/* -------------------------------- Component ------------------------------- */
export default function BuildProfileScreen() {
  const swiperRef = useRef<Swiper>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [loadingMe, setLoadingMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // avatar can be a remote https url (from backend) or a local file:// uri
  const [avatar, setAvatar] = useState<string | null>(null);
  const [bio, setBio] = useState("");

  // Niche selection (chips; must be from VALID_NICHES)
  const [selectedNiches, setSelectedNiches] = useState<ValidNiche[]>([]);

  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([]);
  const [selectedCollabs, setSelectedCollabs] = useState<string[]>([]);

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

  /* --------------------- Manager’s request: log + use avatar --------------------- */
  useEffect(() => {
    (async () => {
      try {
        setLoadingMe(true);
        const res = await apiFetch("/users/me", { method: "GET" }, 30000);
        const raw = await res.text();
        console.log("[/users/me] raw:", raw);
        const data = safeJson(raw);
        console.log("[/users/me] parsed:", data);

        const avatarFromMe =
          data?.profile?.avatar ||
          data?.user?.avatar ||
          data?.profile?.photoUrl ||
          null;

        if (avatarFromMe && typeof avatarFromMe === "string") {
          setAvatar(avatarFromMe);
        }

        // Prefill niche if backend already has them (ensure they are valid)
        const incomingNiche: string[] = Array.isArray(data?.profile?.niche) ? data.profile.niche : [];
        const valid = incomingNiche.filter((n): n is ValidNiche => (VALID_NICHES as readonly string[]).includes(n));
        if (valid.length) {
          setSelectedNiches(valid.slice(0, 5) as ValidNiche[]);
        }

        // Prefill bio
        if (typeof data?.profile?.bio === "string") setBio(data.profile.bio);
      } catch (e) {
        console.warn("Failed to load /users/me", e);
      } finally {
        setLoadingMe(false);
      }
    })();
  }, []);

  /* --------------------------------- Toggles -------------------------------- */
  const togglePurpose = (key: string) =>
    setSelectedPurposes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const toggleCollab = (key: string) =>
    setSelectedCollabs((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const toggleNiche = (n: ValidNiche) =>
    setSelectedNiches((prev) => {
      const has = prev.includes(n);
      if (has) return prev.filter((x) => x !== n) as ValidNiche[];
      if (prev.length >= 5) return prev; // backend max 5
      return [...prev, n] as ValidNiche[];
    });

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
    console.log("✅ Avatar uploaded:", publicUrl);
    return publicUrl;
  }

  /* -------------------------------- Navigation ------------------------------- */
  const handleContinue = () => swiperRef.current?.scrollBy(1, true);

  /* ------------------------------- Final submit ------------------------------ */
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Only upload if user picked a local image
      const avatarUrl = await ensureAvatarUrl(avatar);

      // Ensure we only send valid niches (already enforced by UI)
      const niche = selectedNiches.slice(0, 5);

      const socialLinks = socials.reduce((acc, s) => {
        const v = (s.value || "").trim();
        if (v) (acc as any)[s.key] = v;
        return acc;
      }, {} as Record<SupportedSocial, string>);

      const payload: any = {
        bio: bio || undefined,
        niche,                 // ✅ exact key, exact allowed values
        socialLinks,           // ✅ object shape per docs
        ...(avatarUrl ? { avatar: avatarUrl } : undefined),
      };

      console.log("📤 PUT /profiles/me payload:", payload);

      const res = await apiFetch("/profiles/me", { method: "PUT", body: JSON.stringify(payload) }, 45000);
      const txt = await res.text();
      const data = safeJson(txt);

      if (!res.ok) {
        console.log("Server responded:", txt);
        throw new Error(data?.message || `Save failed (${res.status})`);
      }

      console.log("✅ Profile saved:", data);
      Alert.alert("Success", "Your profile is set!", [{ text: "OK" }]);
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
      {/* Top bar + dots */}
      <View style={styles.topBar}>
        <View style={{ width: 24 }} />
        <View style={styles.dots}>
          {[0, 1, 2, 3, 4, 5].map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.activeDot]} />
          ))}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <Swiper
        ref={swiperRef}
        loop={false}
        showsPagination={false}
        scrollEnabled={false}
        onIndexChanged={(index) => setCurrentIndex(index)}
      >
        {/* SLIDE 1 - Avatar + Bio */}
        <View style={styles.container}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            <Image
              source={avatar ? { uri: avatar } : require("../../assets/images/avatar.png")}
              style={styles.avatar}
            />
            <Image source={require("../../assets/images/edit.png")} style={styles.editIcon} />
          </TouchableOpacity>
          <Text style={styles.title}>Build Your Profile</Text>
          <Text style={styles.label}>Short Bio </Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            placeholder="Write a short bio..."
            placeholderTextColor="#888"
            style={styles.textArea}
          />
          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <LinearGradient colors={["#3B82F6", "#9333EA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* SLIDE 2 - Niches (chips matching backend allow-list) */}
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

          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <LinearGradient colors={["#3B82F6", "#9333EA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* SLIDE 3 - Purpose */}
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Purpose of{"\n"}Using Platform</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: -50 }}>
            {purposeOptions.map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => togglePurpose(item.key)}
                style={[styles.purposeCard, selectedPurposes.includes(item.key) && styles.cardSelected]}
              >
                <View style={styles.cardCheckboxWrapper}>
                  <View style={styles.checkbox}>
                    {selectedPurposes.includes(item.key) && <AntDesign name="check" size={12} color="#000" />}
                  </View>
                </View>
                <Image source={item.icon} style={styles.purposeIcon} />
                <Text style={styles.purposeText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <LinearGradient colors={["#3B82F6", "#9333EA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* SLIDE 4 - Collab */}
        <View style={styles.container}>
          <Text style={styles.title}>Preferred{"\n"}Collab Types</Text>
          <View style={styles.collabContainer}>
            {collabTypes.map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => toggleCollab(item.key)}
                style={[styles.collabCard, selectedCollabs.includes(item.key) && styles.cardSelected]}
              >
                <View style={styles.collabCheckboxWrapper}>
                  <View style={styles.checkbox}>
                    {selectedCollabs.includes(item.key) && <AntDesign name="check" size={12} color="#000" />}
                  </View>
                </View>
                <Image source={item.icon} style={styles.purposeIcon} />
                <Text style={styles.purposeText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <LinearGradient colors={["#3B82F6", "#9333EA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* SLIDE 5 - Socials */}
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
          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <LinearGradient colors={["#3B82F6", "#9333EA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* SLIDE 6 - Done */}
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
  avatarContainer: { position: "relative", marginBottom: 30 },
  avatar: { width: 120, height: 120, resizeMode: "cover", borderRadius: 60, backgroundColor: "#f3f3f3" },
  editIcon: { position: "absolute", bottom: 13, right: 11, width: 24, height: 24, resizeMode: "contain" },
  title: { fontSize: 24, fontWeight: "bold", color: "#9333EA", marginBottom: 20, textAlign: "center" },
  label: { alignSelf: "flex-start", fontSize: 14, marginBottom: 6, color: "#333" },
  subtext: { textAlign: "center", fontSize: 14, color: "#333", marginBottom: 20 },
  textArea: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    minHeight: 100,
    marginBottom: 30,
    textAlignVertical: "top",
    backgroundColor: "#fff",
    color: "#000",
  },
  button: { borderRadius: 10, overflow: "hidden", marginTop: 30, alignSelf: "center" },
  gradient: { paddingVertical: 14, paddingHorizontal: 70, alignItems: "center", borderRadius: 10 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },

  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ccc" },
  activeDot: { backgroundColor: "#A855F7" },

  purposeCard: { width: "47%", aspectRatio: 1, borderWidth: 1, borderColor: "#aaa", borderRadius: 10, padding: 10, alignItems: "center", justifyContent: "center", marginBottom: 15, position: "relative", backgroundColor: "#fff" },
  purposeIcon: { width: 40, height: 40, marginBottom: 10, resizeMode: "contain" },
  purposeText: { fontSize: 12, textAlign: "center", color: "#000" },
  cardSelected: { borderColor: "#9333EA", borderWidth: 2 },

  collabContainer: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 30 },
  collabCard: { width: "30%", aspectRatio: 1, borderWidth: 1, borderColor: "#aaa", borderRadius: 10, padding: 10, alignItems: "center", justifyContent: "center", position: "relative", backgroundColor: "#fff" },
  collabCheckboxWrapper: { position: "absolute", top: 8, left: 8, zIndex: 2 },

  socialRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 12, backgroundColor: "#fff" },
  socialIcon: { width: 22, height: 22, resizeMode: "contain" },
  socialLabel: { fontSize: 15, color: "#000" },

  checkIcon: { width: 100, height: 100, marginVertical: 30, resizeMode: "contain" },
  completeText: { fontSize: 16, textAlign: "center", color: "#000", marginBottom: 40 },

  topBar: {
    backgroundColor: "#fff",
    height: 50,
    paddingTop: 25,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    zIndex: 999,
    position: "relative",
  },
  dots: { flexDirection: "row", gap: 8 },

  // Niches chip grid
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

  checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: "#aaa", backgroundColor: "#fff", borderRadius: 4, justifyContent: "center", alignItems: "center" },
  cardCheckboxWrapper: { position: "absolute", top: 8, left: 8, zIndex: 2 },
});
