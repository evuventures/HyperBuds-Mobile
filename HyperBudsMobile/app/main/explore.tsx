import React, { useEffect, useState, ComponentProps, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/** === API base (Render) === */
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || "").trim() ||
  "https://api-hyperbuds-backend.onrender.com/api/v1";

/* ----------------------------- Helpers ----------------------------- */
const safeJson = (t: string) => {
  try {
    return t ? JSON.parse(t) : {};
  } catch {
    return {};
  }
};

const fetchWithTimeout = (url: string, options: RequestInit = {}, ms = 25000) =>
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
    });
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

/** Auth-aware fetch with 401 refresh retry */
async function apiFetch(path: string, init: RequestInit = {}, timeoutMs = 25000) {
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

/* ----------------------------- Types (lightweight to match docs) ----------------------------- */
type UsersMeResponse = {
  user: { email: string };
  profile?: { displayName?: string; username?: string; avatar?: string };
};

type Suggestion = {
  _id?: string; // match id for actions
  compatibilityScore?: number; // 0-100
  profile?: {
    _id?: string;
    displayName?: string;
    username?: string;
    avatar?: string;
    rizzScore?: number; // 0-100
  };
  breakdown?: {
    audienceOverlap?: number; // 0-1
    nicheCompatibility?: number;
    engagementStyle?: number;
    geolocation?: number;
    activityTime?: number;
    rizzScoreCompatibility?: number;
  };
};

type LeaderboardItem = {
  profile?: { displayName?: string; avatar?: string };
  rizzScore?: number;
  title?: string;
  blurb?: string;
};

/* ----------------------------- Screen ----------------------------- */
export default function Explore() {
  const router = useRouter();

  const [username, setUsername] = useState<string>("there");
  const [loadingName, setLoadingName] = useState(true);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSugg, setLoadingSugg] = useState(true);

  const [trending, setTrending] = useState<LeaderboardItem[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(true);

  // Welcome name from /users/me (fall back to AsyncStorage if needed)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch("/users/me", { method: "GET" });
        const data: UsersMeResponse = safeJson(await res.text());
        if (!res.ok) throw new Error((data as any)?.message || "Failed /users/me");
        const display =
          data?.profile?.displayName ||
          data?.profile?.username ||
          (data?.user?.email ? data.user.email.split("@")[0] : "") ||
          "there";
        if (alive) setUsername(display);
        // Cache for later if you like
        await AsyncStorage.setItem("user.name.cached", display);
      } catch {
        try {
          const cached = await AsyncStorage.getItem("user.name.cached");
          setUsername(cached || "there");
        } catch {
          setUsername("there");
        }
      } finally {
        if (alive) setLoadingName(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Load AI suggestions for avatars + recommendation
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingSugg(true);
        const res = await apiFetch("/matching/suggestions?limit=10", { method: "GET" });
        const text = await res.text();
        const data = safeJson(text);
        // Assume API returns an array of suggestions
        if (alive && Array.isArray(data)) setSuggestions(data as Suggestion[]);
      } catch (e: any) {
        console.warn("suggestions error:", e?.message || e);
      } finally {
        if (alive) setLoadingSugg(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Load simple leaderboard for Trending (best-effort; falls back silently)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingTrend(true);
        const res = await apiFetch("/matching/leaderboard?limit=3", { method: "GET" });
        const text = await res.text();
        const data = safeJson(text);
        if (alive && Array.isArray(data)) {
          // normalize to our render type
          setTrending(
            (data as any[]).map((it) => ({
              profile: it?.profile ?? { displayName: it?.displayName, avatar: it?.avatar },
              rizzScore: it?.rizzScore,
              title: it?.title || it?.profile?.displayName || "Top Creator",
              blurb: it?.blurb || "Rising fast on the leaderboard.",
            }))
          );
        }
      } catch {
        // ignore; UI will show placeholders
      } finally {
        if (alive) setLoadingTrend(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const topRecommendation = suggestions[0];

  const avatars = useMemo(
    () =>
      suggestions.slice(0, 12).map((s, i) => ({
        key: String(i),
        name: s?.profile?.displayName || s?.profile?.username || "Creator",
        avatar: s?.profile?.avatar,
      })),
    [suggestions]
  );

  async function handleSuggestCollab() {
    // We need a match id to act on
    const matchId = topRecommendation?._id;
    if (!matchId) {
      Alert.alert("Unavailable", "This suggestion can’t be actioned yet.");
      return;
    }
    try {
      const res = await apiFetch(`/matching/matches/${matchId}/action`, {
        method: "PUT",
        body: JSON.stringify({ action: "like" }),
      });
      const data = safeJson(await res.text());
      if (!res.ok) throw new Error(data?.message || `Action failed (${res.status})`);
      Alert.alert("Sent", "Collab interest sent!");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not send suggestion.");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header with logo and profile icon */}
      <View style={styles.header}>
        <Image source={require("../../assets/images/hblogo.png")} style={styles.logoImage} />
        <TouchableOpacity onPress={() => router.push("/profile/profile")}>
          <Ionicons name="person-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Welcome Banner */}
        <View style={styles.welcomeContainer}>
          <Image
            source={
              topRecommendation?.profile?.avatar
                ? { uri: topRecommendation.profile.avatar }
                : require("../../assets/images/avatar.png")
            }
            style={styles.welcomeAvatar}
          />
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeTitle}>
              {loadingName ? "Welcome!" : `Welcome ${username}!`}
            </Text>
            <Text style={styles.welcomeSubtitle}>Ready to collab?</Text>
          </View>

          {/* Arrow navigates to How it Works */}
          <TouchableOpacity onPress={() => router.push('/main/matchmaker/how-it-works')}>
            <Ionicons name="arrow-forward" size={24} color="#9333EA" />
          </TouchableOpacity>
        </View>

        {/* Explore Features */}
        <Text style={styles.sectionTitle}>Explore</Text>
        <View style={styles.features}>
          {[
            { key: "matches", icon: "star" as IoniconName, label: "Matches" },
            { key: "collaborations", icon: "hand-left-outline" as IoniconName, label: "Collaborations" },
            { key: "marketplace", icon: "pricetags" as IoniconName, label: "Marketplace" },
            { key: "audience", icon: "people" as IoniconName, label: "Audience" },
          ].map((f) => (
            <View key={f.key} style={styles.featureItem}>
              {f.key === "collaborations" ? (
                <FontAwesome5 name="handshake" size={24} color="#9333EA" />
              ) : (
                <Ionicons name={f.icon} size={24} color="#9333EA" />
              )}
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Avatar Carousel (from suggestions) */}
        <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Creators Near You</Text>
        {loadingSugg ? (
          <ActivityIndicator style={{ marginBottom: 16 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={styles.avatarRow}
          >
            {avatars.length === 0 ? (
              <Text style={{ color: "#666" }}>No suggestions yet.</Text>
            ) : (
              avatars.map((a) => (
                <View key={a.key} style={styles.avatarItem}>
                  {a.avatar ? (
                    <Image source={{ uri: a.avatar }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder} />
                  )}
                  <Text style={styles.avatarName} numberOfLines={1}>
                    {a.name}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* Trending Section (leaderboard) */}
        <Text style={styles.sectionTitle}>Trending</Text>
        {loadingTrend ? (
          <ActivityIndicator style={{ marginBottom: 20 }} />
        ) : trending.length === 0 ? (
          [1, 2, 3].map((i) => (
            <View key={i} style={styles.card}>
              {/* Use sampleimage.png instead of blank placeholder */}
              <Image source={require("../../assets/images/sampleimage.png")} style={styles.cardImage} />
              <Text style={styles.cardTitle}>Featured Collaboration #{i}</Text>
              <Text style={styles.cardSubtitle}>
                Fresh collabs and highlights appear here when available.
              </Text>
              <View style={styles.cardDivider} />
            </View>
          ))
        ) : (
          trending.map((t, i) => (
            <View key={i} style={styles.card}>
              {t.profile?.avatar ? (
                <Image source={{ uri: t.profile.avatar }} style={styles.cardImage} />
              ) : (
                // Use sampleimage.png for missing featured collab images
                <Image source={require("../../assets/images/sampleimage.png")} style={styles.cardImage} />
              )}
              <Text style={styles.cardTitle}>{t.title || "Top Creator"}</Text>
              <Text style={styles.cardSubtitle}>
                {t.blurb || "Climbing the charts with great momentum."}
              </Text>

              <View style={styles.postFooter}>
                <View style={styles.authorRow}>
                  <View style={styles.avatarSmall} />
                  <View style={styles.authorTextWrapper}>
                    <Text style={styles.postAuthor}>
                      {t.profile?.displayName || "Creator"}
                    </Text>
                    <Text style={styles.postSubauthor}>Rizz Score: {t.rizzScore ?? "—"}%</Text>
                  </View>
                </View>
              </View>
              <View style={styles.cardDivider} />
            </View>
          ))
        )}

        {/* Recommended for You (top suggestion) */}
        <Text style={styles.sectionTitle}>Recommended for You</Text>
        <View style={styles.recoCard}>
          {topRecommendation?.profile?.avatar ? (
            <Image
              source={{ uri: topRecommendation.profile.avatar }}
              style={styles.recoImage}
            />
          ) : (
            <View style={styles.recoImagePlaceholder} />
          )}

          <Text style={styles.recoName}>
            {topRecommendation?.profile?.displayName ||
              topRecommendation?.profile?.username ||
              "Your Next Collab"}
          </Text>

          <Text style={styles.recoSubtitle}>
            Rizz Score: {topRecommendation?.profile?.rizzScore ?? "—"}%{"  "}
            |{"  "}
            Compatibility: {topRecommendation?.compatibilityScore ?? "—"}%
          </Text>

          {/* Simple extra signal if breakdown exists */}
          {topRecommendation?.breakdown && (
            <Text style={styles.recoMetrics}>
              Audience Overlap:{" "}
              {Math.round((topRecommendation.breakdown.audienceOverlap ?? 0) * 100)}%{"  "}
              | Niche Fit:{" "}
              {Math.round((topRecommendation.breakdown.nicheCompatibility ?? 0) * 100)}%
            </Text>
          )}

          <View style={styles.recoButtons}>
            <TouchableOpacity
              style={styles.recoGradientBtn}
              onPress={() => router.push("/profile/otherProfile")}
            >
              <LinearGradient
                colors={["#3B82F6", "#9333EA"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.recoGradient}
              >
                <Text style={styles.recoBtnText}>View Profile</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.recoSuggestBtn} onPress={handleSuggestCollab}>
              <Text style={styles.recoSuggestText}>Suggest Collab</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ----------------------------- Styles ----------------------------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  logoImage: { width: 120, height: 40, resizeMode: "contain" },

  container: { padding: 20, paddingBottom: 40 },

  welcomeContainer: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  welcomeAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ddd",
    marginRight: 15,
  },
  welcomeTextContainer: { flex: 1 },
  welcomeTitle: { fontSize: 18, fontWeight: "600", color: "#000" },
  welcomeSubtitle: { fontSize: 14, color: "#666" },

  sectionTitle: { fontSize: 20, fontWeight: "600", marginBottom: 15, color: "#000" },

  features: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  featureItem: { width: "45%", flexDirection: "row", alignItems: "center", marginBottom: 15 },
  featureLabel: { marginLeft: 8, fontSize: 14, color: "#333" },

  avatarRow: { paddingVertical: 4, paddingRight: 8, marginBottom: 20 },
  avatarItem: { alignItems: "center", marginRight: 15, width: 72 },
  avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#ddd" },
  avatarImage: { width: 60, height: 60, borderRadius: 30 },
  avatarName: { marginTop: 5, fontSize: 12, color: "#333" },

  card: { backgroundColor: "#fff", borderRadius: 10, overflow: "hidden", marginBottom: 30 },
  cardImage: { width: "100%", height: 180, resizeMode: "cover", backgroundColor: "#ddd" },
  cardImagePlaceholder: { width: "100%", height: 180, backgroundColor: "#ddd" },
  cardTitle: { fontSize: 16, fontWeight: "600", margin: 10, color: "#000" },
  cardSubtitle: { fontSize: 12, color: "#666", marginHorizontal: 10, marginBottom: 10 },

  postFooter: { paddingTop: 10, paddingHorizontal: 10, paddingBottom: 15 },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ddd",
    marginRight: 10,
    borderWidth: 2,
    borderColor: "#9333EA",
  },
  authorTextWrapper: { marginLeft: 2 },
  postAuthor: { fontSize: 14, fontWeight: "600", color: "#000" },
  postSubauthor: { fontSize: 12, color: "#666" },

  cardDivider: { height: 1, backgroundColor: "#eee", marginHorizontal: 10 },

  recoCard: { backgroundColor: "#fff", borderRadius: 10, overflow: "hidden", padding: 20, marginBottom: 40 },
  recoImage: { width: "100%", height: 180, borderRadius: 10, backgroundColor: "#ddd" },
  recoImagePlaceholder: { width: "100%", height: 180, backgroundColor: "#ddd", borderRadius: 10 },
  recoName: { fontSize: 16, fontWeight: "600", marginTop: 15, color: "#000" },
  recoSubtitle: { fontSize: 12, color: "#666", marginVertical: 5 },
  recoMetrics: { fontSize: 12, color: "#000", marginBottom: 15 },

  recoButtons: { flexDirection: "row", justifyContent: "space-between" },
  recoGradientBtn: { flex: 1, marginRight: 10, borderRadius: 10, overflow: "hidden" },
  recoGradient: { paddingVertical: 12, alignItems: "center", borderRadius: 10 },
  recoBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  recoSuggestBtn: {
    flex: 1,
    backgroundColor: "#000",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  recoSuggestText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
