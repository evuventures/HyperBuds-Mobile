import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view"; // ⭐ ADDED
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

/** === API base === */
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

const fetchWithTimeout = (
  url: string,
  options: RequestInit = {},
  ms = 25000
) =>
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
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
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

async function apiFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = 25000
) {
  const accessToken = await AsyncStorage.getItem("auth.accessToken");
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(init.headers as Record<string, string>),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  const go = () =>
    fetchWithTimeout(`${API_BASE}${path}`, { ...init, headers }, timeoutMs);

  let res = await go();
  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newAccess = await AsyncStorage.getItem("auth.accessToken");
      const headers2: Record<string, string> = { ...headers };
      if (newAccess) headers2.Authorization = `Bearer ${newAccess}`;
      res = await fetchWithTimeout(
        `${API_BASE}${path}`,
        { ...init, headers: headers2 },
        timeoutMs
      );
    }
  }
  return res;
}

type UsersMeResponse = {
  user: { email: string };
  profile?: { displayName?: string; username?: string; avatar?: string };
};

/* ----------------------------- Screen ----------------------------- */
export default function Explore() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("Christina");

  // Fetch username
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch("/users/me", { method: "GET" });
        const data: UsersMeResponse = safeJson(await res.text());
        if (!res.ok) throw new Error();

        const display =
          data?.profile?.displayName ||
          data?.profile?.username ||
          (data?.user?.email ? data.user.email.split("@")[0] : "") ||
          "Christina";

        if (alive) setUsername(display);
      } catch {
        try {
          const cached = await AsyncStorage.getItem("user.name.cached");
          setUsername(cached || "Christina");
        } catch {
          setUsername("Christina");
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => router.push("/profile/profile")}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>A</Text>
          </View>

          {/* ⭐ Gradient HyperBuds Text */}
          <MaskedView
            maskElement={
              <Text style={[styles.logoText, { color: "black" }]}>
                HyperBuds
              </Text>
            }
          >
            <LinearGradient
              colors={["#8B5CF6", "#3B82F6"]} // Purple 500 → Blue 500
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }} // Horizontal
            >
              <Text style={[styles.logoText, { opacity: 0 }]}>HyperBuds</Text>
            </LinearGradient>
          </MaskedView>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/profile/notify")}>
          <Ionicons name="menu" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Scroll Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Good Morning Banner */}
        <LinearGradient
          colors={["#7C3AED", "#3B82F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.morningBanner}
        >
          <View style={styles.morningBadge}>
            <Ionicons name="sparkles" size={14} color="#fff" />
            <Text style={styles.morningBadgeText}>
              Good Morning, {username}!
            </Text>
          </View>
          <Text style={styles.morningTitle}>Ready to create something</Text>
          <Text style={styles.morningTitle}>amazing today?</Text>
          <Text style={styles.morningSubtitle}>
            We have 25 new collabos and 3 collaboration trends waiting for
            {"\n"}you and your team today!
          </Text>
          <View style={styles.morningButtons}>
            <TouchableOpacity style={styles.morningBtnPrimary}>
              <Text style={styles.morningBtnPrimaryText}>Go Solo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.morningBtnSecondary}>
              <Text style={styles.morningBtnSecondaryText}>Join Collab</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Trending Section */}
        <View style={styles.section}>
          <View style={styles.trendingHeaderContainer}>
            <View style={styles.trendingIconCircle}>
              <Ionicons name="trending-up" size={24} color="#fff" />
            </View>
            <View style={styles.trendingTextContainer}>
              <Text style={styles.trendingTitle}>Trending Collaborations</Text>
              <Text style={styles.trendingSubtitle}>
                Most watched content this week
              </Text>
            </View>
          </View>

          <View style={styles.comingSoonContainer}>
            <View style={styles.comingSoonDot} />
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>

          <LinearGradient
            colors={["#7C3AED", "#6D28D9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.getReadyCard}
          >
            <View style={styles.getReadyIconContainer}>
              <Ionicons name="flash" size={48} color="#fff" />
            </View>
            <Text style={styles.getReadyTitle}>Get Ready to</Text>
            <Text style={styles.getReadyTitle}>Connect!</Text>
            <Text style={styles.getReadyDescription}>
              The Trending Collaborations feed is designed to help you discover
              top-tier creators, track viral content trends, and find the
              perfect co-creator for your next project.
            </Text>
          </LinearGradient>
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={20} color="#EC4899" />
            <Text style={styles.sectionTitle}>Recommendations</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Collabos you picked up - give them another chance
          </Text>
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyEmoji}>🎯</Text>
            </View>
            <Text style={styles.emptyTitle}>No Recommendations Yet</Text>
            <Text style={styles.emptyText}>
              Start exploring and collaborating! We'll show you{"\n"}
              personalized picks as you go to help them match better.
            </Text>
            <TouchableOpacity style={styles.generateBtn}>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.generateBtnText}>Start to Generate</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ready Section */}
        <LinearGradient
          colors={["#7C3AED", "#6D28D9"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.readyCard}
        >
          <Text style={styles.readyTitle}>Ready to Start Your Next</Text>
          <Text style={styles.readyTitle}>Collaboration?</Text>
          <Text style={styles.readySubtitle}>
            Join trending collabos or create something brand new with{"\n"}your
            community!
          </Text>
          <View style={styles.readyButtons}>
            <TouchableOpacity style={styles.readyBtnPrimary}>
              <Text style={styles.readyBtnPrimaryText}>Browse Collabos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.readyBtnSecondary}>
              <Text style={styles.readyBtnSecondaryText}>Create Portal</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ScrollView>

      {/* Floating Notification Button */}
      <TouchableOpacity
        style={styles.floatingBtn}
        onPress={() => router.push("/profile/notify")}
      >
        <Ionicons name="notifications" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* ----------------------------- Styles ----------------------------- */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  logoText: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },

  /* ... (all your original styles unchanged below this point) ... */

  morningBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
  },
  morningBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  morningBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  morningTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  morningSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    marginTop: 12,
    marginBottom: 16,
    lineHeight: 20,
  },
  morningButtons: {
    flexDirection: "row",
    gap: 8,
  },
  morningBtnPrimary: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  morningBtnPrimaryText: {
    color: "#7C3AED",
    fontSize: 14,
    fontWeight: "600",
  },
  morningBtnSecondary: {
    backgroundColor: "rgba(124, 58, 237, 0.5)",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  morningBtnSecondaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
    color: "#000",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },

  trendingHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  trendingIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  trendingTextContainer: {
    flex: 1,
  },
  trendingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  trendingSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },

  comingSoonContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  comingSoonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B35",
    marginRight: 8,
  },
  comingSoonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },

  getReadyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  getReadyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  getReadyTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 34,
  },
  getReadyDescription: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 22,
  },

  emptyState: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  generateBtn: {
    backgroundColor: "#7C3AED",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  generateBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  readyCard: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 80,
    borderRadius: 16,
    padding: 20,
  },
  readyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  readySubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    marginTop: 12,
    marginBottom: 16,
    lineHeight: 20,
  },

  readyButtons: {
    flexDirection: "row",
    gap: 8,
  },
  readyBtnPrimary: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  readyBtnPrimaryText: {
    color: "#7C3AED",
    fontSize: 14,
    fontWeight: "700",
  },
  readyBtnSecondary: {
    flex: 1,
    backgroundColor: "rgba(124, 58, 237, 0.5)",
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  readyBtnSecondaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  floatingBtn: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
