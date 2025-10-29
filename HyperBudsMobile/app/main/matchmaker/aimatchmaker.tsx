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
  TextInput,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

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
    audienceOverlap?: number; // 0-1
    nicheCompatibility?: number; // 0-1
    engagementStyle?: number; // 0-1
    geolocation?: number; // 0-1
    activityTime?: number; // 0-1
    rizzScoreCompatibility?: number; // 0-1
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

  // --- Tab state ---
  const [activeTab, setActiveTab] = useState<"ai" | "prefs">("ai");

  // --- Existing AI match states & animation (left unchanged) ---
  const [loading, setLoading] = useState(false);
  const [match, setMatch] = useState<Suggestion | null>(null);
  const [empty, setEmpty] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [randomRizz, setRandomRizz] = useState<number>(0);
  const rizzInterval = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    return () => stopAnimation();
  }, []);

  const resolveLocationQS = async (): Promise<string> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { longitude, latitude } = loc.coords || {};
        if (
          typeof longitude === "number" &&
          isFinite(longitude) &&
          typeof latitude === "number" &&
          isFinite(latitude)
        ) {
          return `&lng=${longitude}&lat=${latitude}`;
        }
      }
    } catch {
      // ignore
    }

    try {
      const res = await apiFetch("/profiles/me", { method: "GET" });
      const text = await res.text();
      const data = JSON.parse(text || "{}");
      const coords = data?.location?.coordinates;
      if (
        Array.isArray(coords) &&
        coords.length === 2 &&
        typeof coords[0] === "number" &&
        isFinite(coords[0]) &&
        typeof coords[1] === "number" &&
        isFinite(coords[1])
      ) {
        return `&lng=${coords[0]}&lat=${coords[1]}`;
      }
    } catch {
      // ignore
    }
    return "";
  };

  const handleGetMatch = async () => {
    setLoading(true);
    setMatch(null);
    setEmpty(false);
    setRandomRizz(0);
    startAnimation();

    try {
      const locQS = await resolveLocationQS();
      const url = `/matching/suggestions?refresh=true&limit=1${locQS}`;
      const res = await apiFetch(url, { method: "GET" });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text || "{}");
      } catch {
        // pass
      }

      setTimeout(() => {
        stopAnimation();
        if (!res.ok || (data && typeof data === "object" && "message" in data)) {
          setLoading(false);
          setMatch(null);
          setEmpty(false);
          Alert.alert("Matching unavailable", data?.message || "Please try again later.");
          return;
        }

        const suggestions: Suggestion[] | undefined = data?.matches;
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          setMatch(suggestions[0]);
          setEmpty(false);
        } else {
          setMatch(null);
          setEmpty(true);
        }
        setLoading(false);
      }, 3500);
    } catch (e) {
      stopAnimation();
      setLoading(false);
      setMatch(null);
      setEmpty(false);
      Alert.alert("Network error", "Could not fetch suggestions.");
    }
  };

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

  // --- Preferences state (local only) ---
  const initialCollabs = {
    "Live Stream": false,
    Duet: false,
    Reaction: false,
    Podcast: false,
    Tutorial: false,
    Challenge: false,
    Reviews: false,
    Interview: false,
  };

  const [collabTypes, setCollabTypes] = useState<Record<string, boolean>>(initialCollabs);
  const [minFollowers, setMinFollowers] = useState<string>("1000");
  const [maxFollowers, setMaxFollowers] = useState<string>("1000000");
  const [location, setLocation] = useState<string>("Select a location");
  const [niche, setNiche] = useState<string>("Select a niche");
  const [showNicheOptions, setShowNicheOptions] = useState<boolean>(false);
  const [showLocationOptions, setShowLocationOptions] = useState<boolean>(false);
  const [showFrequencyOptions, setShowFrequencyOptions] = useState<boolean>(false);
  const [maxDistance, setMaxDistance] = useState<number>(50);
  const [frequency, setFrequency] = useState<string>("Weekly");

  const NICHE_OPTIONS = [
    "Beauty",
    "Gaming",
    "Music",
    "Fitness",
    "Food",
    "Travel",
    "Fashion",
    "Tech",
  ];

  const LOCATION_OPTIONS = [
    "New York, NY",
    "Los Angeles, CA",
    "Chicago, IL",
    "Houston, TX",
    "Miami, FL",
    "Atlanta, GA",
    "Remote/Online",
  ];

  const FREQUENCY_OPTIONS = ["Daily", "Weekly", "Bi-weekly", "Monthly", "Occasionally"];

  const toggleCollab = (key: string) => {
    setCollabTypes((s) => ({ ...s, [key]: !s[key] }));
  };

  const handleSavePreferences = () => {
    // Get selected collaboration types
    const selected = Object.entries(collabTypes)
      .filter(([_, isSelected]) => isSelected)
      .map(([type, _]) => type);

    Alert.alert(
      "Preferences Saved",
      `Selected collaborations: ${selected.length > 0 ? selected.join(", ") : "None"}\nMin Followers: ${minFollowers}\nMax Followers: ${maxFollowers}\nLocation: ${location}\nNiche: ${niche}\nMax Distance: ${maxDistance} mi\nFrequency: ${frequency}`,
      [{ text: "OK" }]
    );
  };

  // Top header/profile area for Preferences tab
  const ProfileHeader = () => (
    <View style={styles.profileCard}>
      <View style={styles.profileRow}>
        <Image
          source={require("../../../assets/images/avatar.png")}
          style={styles.profileAvatar}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.profileName}>Test5867123</Text>
          <Text style={styles.profileSub}>Anything Growth</Text>
        </View>
        <TouchableOpacity style={styles.headerEllipsis}>
          <Feather name="more-vertical" size={20} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAIMatches = () => (
    <>
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
          <Text style={styles.matchBtnText}>{loading ? "Finding…" : "Get a Match"}</Text>
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
                : require("../../../assets/images/avatar.png")
            }
            style={styles.resultAvatar}
          />
          <Text style={styles.resultName}>{match.profile?.displayName || "Unknown"}</Text>
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
    </>
  );

  const renderPreferences = () => (
    <>
      <ProfileHeader />

      <View style={styles.prefsCard}>
        <Text style={styles.sectionTitle}>Collaboration Preferences</Text>
        <Text style={styles.sectionHint}>
          Tell us about your ideal collaboration partners and we'll find the perfect match!
        </Text>

        {/* Collaboration Types - 2 columns x 4 rows */}
        <View style={styles.collabGrid}>
          {Object.keys(collabTypes).map((k) => {
            const active = collabTypes[k];
            return (
              <TouchableOpacity
                key={k}
                onPress={() => toggleCollab(k)}
                style={[
                  styles.collabCell,
                  active ? styles.collabCellActive : undefined,
                ]}
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <View style={[styles.circle, active ? styles.circleActive : undefined]}>
                  {active && <Feather name="check" size={14} color="#fff" />}
                </View>
                <View style={styles.collabTextWrap}>
                  <Text style={[styles.collabTitle, active ? styles.collabTitleActive : {}]}>
                    {k}
                  </Text>
                  <Text style={styles.collabSubtitle}>{getCollabSubtitle(k)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 14 }} />

        <View style={styles.row}>
          <View style={styles.inputCol}>
            <Text style={styles.label}>Minimum Followers</Text>
            <TextInput
              value={minFollowers}
              onChangeText={setMinFollowers}
              keyboardType="numeric"
              style={styles.input}
            />
            <Text style={styles.inputHint}>e.g. 1000</Text>
          </View>
          <View style={styles.inputCol}>
            <Text style={styles.label}>Maximum Followers</Text>
            <TextInput
              value={maxFollowers}
              onChangeText={setMaxFollowers}
              keyboardType="numeric"
              style={styles.input}
            />
            <Text style={styles.inputHint}>e.g. 1,000,000</Text>
          </View>
        </View>

        <View style={{ height: 12 }} />

        <Text style={styles.label}>Preferred Locations</Text>
        <TouchableOpacity
          style={styles.select}
          onPress={() => {
            setShowLocationOptions(!showLocationOptions);
            setShowNicheOptions(false);
            setShowFrequencyOptions(false);
          }}
        >
          <Text style={styles.selectText}>{location}</Text>
          <Feather name="chevron-down" size={18} color="#666" />
        </TouchableOpacity>

        {/* Location options dropdown */}
        {showLocationOptions && (
          <View style={styles.nicheDropdown}>
            {LOCATION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  setLocation(opt);
                  setShowLocationOptions(false);
                }}
                style={styles.nicheOption}
              >
                <Text style={styles.nicheOptionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 12 }} />

        <Text style={styles.label}>Preferred Niches</Text>
        <TouchableOpacity
          style={styles.select}
          onPress={() => {
            setShowNicheOptions(!showNicheOptions);
            setShowLocationOptions(false);
            setShowFrequencyOptions(false);
          }}
        >
          <Text style={styles.selectText}>{niche}</Text>
          <Feather name="chevron-down" size={18} color="#666" />
        </TouchableOpacity>

        {/* Niche options dropdown */}
        {showNicheOptions && (
          <View style={styles.nicheDropdown}>
            {NICHE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  setNiche(opt);
                  setShowNicheOptions(false);
                }}
                style={styles.nicheOption}
              >
                <Text style={styles.nicheOptionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 18 }} />

        <Text style={styles.label}>Maximum Distance</Text>
        <View style={styles.distanceRow}>
          <View style={styles.distanceCircle}>
            <View style={styles.distanceInner}>
              <Text style={styles.distanceBig}>{maxDistance}</Text>
              <Text style={styles.distanceSmall}>mi</Text>
            </View>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.distanceButtonsRow}>
              {[10, 50, 100, 250].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setMaxDistance(d)}
                  style={[
                    styles.distanceBtn,
                    maxDistance === d ? styles.distanceBtnActive : undefined,
                  ]}
                >
                  <Text
                    style={
                      maxDistance === d ? styles.distanceBtnTextActive : styles.distanceBtnText
                    }
                  >
                    {d} mi
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.inputHint}>How far are you willing to travel for collabs?</Text>
          </View>
        </View>

        <View style={{ height: 18 }} />

        <Text style={styles.label}>Content Frequency</Text>
        <TouchableOpacity
          style={styles.select}
          onPress={() => {
            setShowFrequencyOptions(!showFrequencyOptions);
            setShowLocationOptions(false);
            setShowNicheOptions(false);
          }}
        >
          <Text style={styles.selectText}>{frequency}</Text>
          <Feather name="chevron-down" size={18} color="#666" />
        </TouchableOpacity>

        {/* Frequency options dropdown */}
        {showFrequencyOptions && (
          <View style={styles.nicheDropdown}>
            {FREQUENCY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  setFrequency(opt);
                  setShowFrequencyOptions(false);
                }}
                style={styles.nicheOption}
              >
                <Text style={styles.nicheOptionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />

        <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={handleSavePreferences}>
          <LinearGradient
            colors={["#9333EA", "#3B82F6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtnGrad}
          >
            <Text style={styles.saveBtnText}>Save preferences & Find Matches</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() =>
            router.canGoBack() ? router.back() : router.push("/main/explore")
          }
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Matchmaker</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Feather name="search" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "ai" ? styles.tabActive : undefined]}
          onPress={() => setActiveTab("ai")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "ai" ? styles.tabTextActive : undefined,
            ]}
          >
            AI Matches
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "prefs" ? styles.tabActive : undefined]}
          onPress={() => setActiveTab("prefs")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "prefs" ? styles.tabTextActive : undefined,
            ]}
          >
            Preferences
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        {activeTab === "ai" ? renderAIMatches() : renderPreferences()}
      </ScrollView>
    </View>
  );
}

/** helper to provide the small subtitle text under each collab type */
function getCollabSubtitle(key: string) {
  switch (key) {
    case "Live Stream":
      return "Synchronous Content Creation";
    case "Duet":
      return "Synchronous Content Creation";
    case "Reaction":
      return "Reacting to each other's content";
    case "Podcast":
      return "Audio Content Collaboration";
    case "Tutorial":
      return "Educational content together";
    case "Challenge":
      return "Fun challenges and games";
    case "Reviews":
      return "Product or content reviews";
    case "Interview":
      return "Creator interviews";
    default:
      return "";
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 48,
    height: 48,
    marginTop: Platform.OS === "ios" ? 6 : 0,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  // Tabs
  tabsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 999 },
  tabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tabText: { fontSize: 14, color: "#6B7280", fontWeight: "700" },
  tabTextActive: { color: "#6D28D9" },

  // Match button + loader
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

  // Result card
  resultCard: {
    marginTop: 30,
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#F9F9F9",
    elevation: 2,
  },
  resultAvatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 12 },
  resultName: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 6 },
  resultScore: { fontSize: 14, color: "#666", marginBottom: 4 },
  suggestBtn: { marginTop: 16 },
  suggestBtnGrad: { paddingVertical: 10, paddingHorizontal: 32, borderRadius: 999 },
  suggestBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  breakdownBox: { marginTop: 20, width: "100%" },
  breakdownTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12, color: "#333" },
  breakdownRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
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

  // Preferences styles
  profileCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileRow: { flexDirection: "row", alignItems: "center" },
  profileAvatar: { width: 56, height: 56, borderRadius: 28 },
  profileName: { fontSize: 16, fontWeight: "700", color: "#111" },
  profileSub: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  headerEllipsis: { width: 44, alignItems: "center", justifyContent: "center" },

  prefsCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 6 },
  sectionHint: { color: "#6B7280", fontSize: 13, marginBottom: 12 },

  // Collaboration grid - UPDATED for more obvious selection
  collabGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  collabCell: {
    width: "48%",
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E6E6E9",
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  collabCellActive: {
    borderColor: "#7C3AED",
    backgroundColor: "#F3E8FF",
    shadowColor: "#7C3AED",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
  },
  circleActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  collabTextWrap: { flex: 1 },
  collabTitle: { fontSize: 14, fontWeight: "700", color: "#6B7280", marginBottom: 4 },
  collabTitleActive: { color: "#6D28D9" },
  collabSubtitle: { fontSize: 12, color: "#9CA3AF" },

  row: { flexDirection: "row", justifyContent: "space-between" },
  inputCol: { flex: 1, marginRight: 8 },
  label: { fontSize: 13, color: "#374151", fontWeight: "700", marginBottom: 6 },
  input: {
    height: 44,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },
  inputHint: { fontSize: 12, color: "#9CA3AF", marginTop: 6 },

  select: {
    height: 48,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  selectText: { color: "#374151", fontSize: 14 },

  // Niche dropdown list
  nicheDropdown: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 10,
    marginTop: 8,
    overflow: "hidden",
    maxHeight: 200,
  },
  nicheOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  nicheOptionText: { fontSize: 14, color: "#111" },

  distanceRow: { flexDirection: "row", alignItems: "center" },
  distanceCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  distanceInner: { alignItems: "center" },
  distanceBig: { fontSize: 20, fontWeight: "700", color: "#6D28D9" },
  distanceSmall: { fontSize: 12, color: "#6D28D9" },
  distanceButtonsRow: { flexDirection: "row", flexWrap: "wrap" },
  distanceBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    marginRight: 8,
    marginBottom: 8,
  },
  distanceBtnActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  distanceBtnText: { color: "#374151", fontWeight: "700" },
  distanceBtnTextActive: { color: "#fff", fontWeight: "700" },

  saveBtn: { marginTop: 6 },
  saveBtnGrad: { paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});