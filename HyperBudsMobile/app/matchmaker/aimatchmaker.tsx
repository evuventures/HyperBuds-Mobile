// app/matchmaker/aimatchmaker.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** API base */
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || "").trim() ||
  "https://api-hyperbuds-backend.onrender.com/api/v1";

const { width } = Dimensions.get("window");

type Suggestion = {
  _id: string;
  compatibilityScore: number; // 0-100
  profile: {
    displayName?: string;
    avatar?: string;
    rizzScore?: number; // 0-100
  };
  breakdown?: {
    audienceOverlap?: number;         // 0-1
    nicheCompatibility?: number;      // 0-1
    engagementStyle?: number;         // 0-1
    geolocation?: number;             // 0-1
    activityTime?: number;            // 0-1
    rizzScoreCompatibility?: number;  // 0-1
  };
};

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const accessToken = await AsyncStorage.getItem("auth.accessToken");
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(init.headers as Record<string, string>),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

export default function AIMatchmakerScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [match, setMatch] = useState<Suggestion | null>(null);
  const [empty, setEmpty] = useState(false);

  /** animation refs */
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [randomRizz, setRandomRizz] = useState<number>(0);
  const rizzInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  /** start loader animation */
  const startAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 400,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // random rizz % numbers
    rizzInterval.current = setInterval(() => {
      setRandomRizz(Math.floor(80 + Math.random() * 20));
    }, 500);
  };

  const stopAnimation = () => {
    scaleAnim.stopAnimation();
    if (rizzInterval.current) {
      clearInterval(rizzInterval.current);
      rizzInterval.current = null;
    }
  };

  // cleanup on unmount
  useEffect(() => {
    return () => stopAnimation();
  }, []);

  /** fetch a match */
  const handleGetMatch = async () => {
    setLoading(true);
    setMatch(null);
    setEmpty(false);
    setRandomRizz(0);
    startAnimation();

    try {
      const res = await apiFetch("/matching/suggestions?refresh=true&limit=1", {
        method: "GET",
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text || "{}");
      } catch {
        // fallthrough
      }

      // Ensure animation feels like “magic”
      setTimeout(() => {
        stopAnimation();

        // Handle error shape: { message: "..." }
        if (!res.ok || (data && typeof data === "object" && "message" in data)) {
          setLoading(false);
          setMatch(null);
          setEmpty(false);
          Alert.alert(
            "Matching unavailable",
            data?.message || "Please try again later."
          );
          return;
        }

        // Handle expected API shape: { matches: Suggestion[], pagination: {...} }
        const suggestions: Suggestion[] | undefined = data?.matches;
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          setMatch(suggestions[0]);
          setEmpty(false);
        } else {
          // No results
          setMatch(null);
          setEmpty(true);
          // console.warn("Unexpected match response", data);
        }
        setLoading(false);
      }, 3500);
    } catch (e) {
      stopAnimation();
      setLoading(false);
      setMatch(null);
      setEmpty(false);
      Alert.alert("Network error", "Could not fetch suggestions.");
      // console.error("Match error", e);
    }
  };

  /** render breakdown bars */
  const renderBreakdown = (label: string, value?: number) => {
    if (value == null) return null;
    const pct = Math.round(value * 100);
    return (
      <View style={styles.breakdownRow} key={label}>
        <Text style={styles.breakdownLabel}>{label}</Text>
        <View style={styles.breakdownBarBg}>
          <View style={[styles.breakdownBarFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.breakdownPct}>{pct}%</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.header}>
        {/* Bigger hitbox + slightly lower placement */}
        <TouchableOpacity
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => (router.canGoBack() ? router.back() : router.push("/main/explore"))}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={26} color="#333" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>AI Matchmaker</Text>
        {/* spacer to keep title centered */}
        <View style={{ width: 60, height: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Get a Match button */}
        <TouchableOpacity
          onPress={handleGetMatch}
          disabled={loading}
          style={{ alignSelf: "center", marginBottom: 20 }}
        >
          <LinearGradient
            colors={["#9333EA", "#3B82F6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.matchBtn}
          >
            <Text style={styles.matchBtnText}>
              {loading ? "Finding…" : "Get a Match"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Loader state */}
        {loading && (
          <View style={styles.loader}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <View style={styles.avatarPlaceholder} />
            </Animated.View>
            <Text style={styles.loaderText}>{randomRizz}% Rizz Magic…</Text>
            <ActivityIndicator size="large" color="#9333EA" style={{ marginTop: 16 }} />
          </View>
        )}

        {/* Empty state */}
        {!loading && empty && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No matches (yet)</Text>
            <Text style={styles.emptyHint}>
              Try adding niches and a location in Edit Profile, then try again.
            </Text>
          </View>
        )}

        {/* Result */}
        {match && !loading && (
          <View style={styles.resultCard}>
            <Image
              source={
                match.profile?.avatar
                  ? { uri: match.profile.avatar }
                  : require("../../assets/images/avatar.png")
              }
              style={styles.resultAvatar}
            />
            <Text style={styles.resultName}>
              {match.profile?.displayName || "Unknown"}
            </Text>
            <Text style={styles.resultScore}>
              Compatibility: {Math.round(match.compatibilityScore)}%
            </Text>
            <Text style={styles.resultScore}>
              Rizz Score: {match.profile?.rizzScore ?? "—"}%
            </Text>

            <TouchableOpacity style={styles.suggestBtn}>
              <LinearGradient
                colors={["#9333EA", "#3B82F6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.suggestBtnGrad}
              >
                <Text style={styles.suggestBtnText}>Suggest Collab</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* breakdown */}
            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownTitle}>Compatibility Breakdown</Text>
              {renderBreakdown("Audience Overlap", match.breakdown?.audienceOverlap)}
              {renderBreakdown("Niche Compatibility", match.breakdown?.nicheCompatibility)}
              {renderBreakdown("Engagement Style", match.breakdown?.engagementStyle)}
              {renderBreakdown("Geolocation", match.breakdown?.geolocation)}
              {renderBreakdown("Activity Time", match.breakdown?.activityTime)}
              {renderBreakdown("Rizz Compatibility", match.breakdown?.rizzScoreCompatibility)}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8, // a bit taller header
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#333" },

  // Bigger hitbox + lowered a bit
  backButton: {
    width: 60,
    height: 60,
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  matchBtn: { paddingVertical: 12, paddingHorizontal: 40, borderRadius: 999 },
  matchBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  loader: { alignItems: "center", marginTop: 40 },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#EEE",
  },
  loaderText: { marginTop: 16, fontSize: 16, color: "#9333EA", fontWeight: "600" },

  emptyState: {
    alignItems: "center",
    marginTop: 30,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F9F9F9",
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 6 },
  emptyHint: { fontSize: 13, color: "#666", textAlign: "center" },

  resultCard: {
    marginTop: 30,
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#F9F9F9",
    elevation: 2,
  },
  resultAvatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 12 },
  resultName: { fontSize: 20, fontWeight: "700", color: "#333", marginBottom: 6 },
  resultScore: { fontSize: 14, color: "#666", marginBottom: 4 },

  suggestBtn: { marginTop: 16 },
  suggestBtnGrad: { paddingVertical: 10, paddingHorizontal: 32, borderRadius: 999 },
  suggestBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  breakdownBox: { marginTop: 20, width: "100%" },
  breakdownTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12, color: "#333" },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  breakdownLabel: { flex: 1, fontSize: 13, color: "#555" },
  breakdownBarBg: {
    flex: 2,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
    overflow: "hidden",
  },
  breakdownBarFill: { height: "100%", borderRadius: 4, backgroundColor: "#9333EA" },
  breakdownPct: { width: 40, fontSize: 12, textAlign: "right", color: "#333" },
});
