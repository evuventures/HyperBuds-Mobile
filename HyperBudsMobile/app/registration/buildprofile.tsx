// app/login&signup/buildprofile.tsx
import { AntDesign } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Swiper from "react-native-swiper";

// Prefer env var; fallback to your LAN IP (keep this updated!)
const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://10.0.0.106:3000";

export default function BuildProfileScreen() {
  const router = useRouter();

  const categoriesData = {
    Creator: [
      "Audio: Podcasting, ASMR",
      "Writing: Blogging, Copywriting",
      "Social Media: Instagram Influencer, TikTok Creator",
      "Lifestyle: Beauty, Fitness",
      "Education: Online Courses, Tutorials",
    ],
    Artist: ["Sample text 1", "Sample text 2"],
    Developer: ["Sample text 1", "Sample text 2"],
    Educator: ["Sample text 1", "Sample text 2"],
    "Social Connection": ["Sample text 1", "Sample text 2"],
  };

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

  const [socials, setSocials] = useState([
    { key: "instagram", label: "Instagram", icon: require("../../assets/images/ig.png"), value: "" },
    { key: "tiktok", label: "TikTok", icon: require("../../assets/images/tiktok.png"), value: "" },
    { key: "youtube", label: "YouTube", icon: require("../../assets/images/yt.png"), value: "" },
    { key: "snapchat", label: "Snapchat", icon: require("../../assets/images/snap.png"), value: "" },
    { key: "twitter", label: "Twitter", icon: require("../../assets/images/twitter.png"), value: "" },
    { key: "facebook", label: "Facebook", icon: require("../../assets/images/fb.png"), value: "" },
  ]);

  const [avatar, setAvatar] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const swiperRef = useRef<Swiper>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<{ [key: string]: string[] }>({});
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([]);
  const [selectedCollabs, setSelectedCollabs] = useState<string[]>([]);

  // ---------- toggles ----------
  const togglePurpose = (key: string) => {
    setSelectedPurposes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleCollab = (key: string) => {
    setSelectedCollabs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories((prev) => prev.filter((item) => item !== category));
      setSelectedSubcategories((prev) => {
        const updated = { ...prev };
        delete updated[category];
        return updated;
      });
    } else {
      setSelectedCategories((prev) => [...prev, category]);
    }
  };

  const toggleSubcategory = (category: string, sub: string) => {
    const existing = selectedSubcategories[category] || [];
    const updated = existing.includes(sub)
      ? existing.filter((s) => s !== sub)
      : [...existing, sub];

    if (!selectedCategories.includes(category)) {
      setSelectedCategories((prev) => [...prev, category]);
    }
    setSelectedSubcategories((prev) => ({ ...prev, [category]: updated }));
  };

  // ---------- image picker ----------
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Permission to access camera roll is required!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7, // smaller file → faster upload over LAN
    });
    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  // ---------- nav ----------
  const handleContinue = () => {
    swiperRef.current?.scrollBy(1, true);
  };

  // ---------- net utils ----------
  const fetchWithTimeout = (url: string, options: RequestInit, ms = 45000) => {
    return Promise.race([
      fetch(url, options),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error("Network timeout")), ms)
      ),
    ]) as Promise<Response>;
  };

  const ensureAvatarUrl = async (uri: string | null) => {
    if (!uri) return undefined;
    if (/^https?:\/\//i.test(uri)) return uri;

    console.log("⏫ Uploading avatar to backend…", { API_BASE, uri });
    const fd = new FormData();
    fd.append("file", {
      uri,
      name: "avatar.jpg",
      type: "image/jpeg",
    } as any);

    const r = await fetchWithTimeout(`${API_BASE}/profiles/upload-media`, {
      method: "POST",
      body: fd, // do NOT set Content-Type manually
    });

    const text = await r.text();
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}

    if (!r.ok) {
      console.log("Upload response:", text);
      throw new Error(data?.error || `Upload failed (${r.status})`);
    }
    console.log("✅ Avatar uploaded:", data?.url);
    return data.url as string;
  };

  // ---------- final submit ----------
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      console.log("▶️ Start pressed");

      const avatarUrl = await ensureAvatarUrl(avatar);

      const nichesArray = Array.from(
        new Set(Object.values(selectedSubcategories || {}).flat().filter(Boolean))
      );

      const profileData = {
        avatar: avatarUrl, // public URL from backend
        bio,
        niches: nichesArray,
        purposes: selectedPurposes,
        collabs: selectedCollabs,
        socials: socials.reduce(
          (acc, s) => ({ ...acc, [s.key]: s.value }),
          {} as Record<string, string>
        ),
      };

      console.log("📤 PUT /profiles/me payload:", profileData);

      const res = await fetchWithTimeout(
        `${API_BASE}/profiles/me`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(profileData),
        },
        45000
      );

      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}

      if (!res.ok) {
        console.log("Server said:", text);
        throw new Error(data?.message || `Server responded with ${res.status}`);
      }

      console.log("✅ Final profile saved:", data);
      router.push("/profile/profile");
    } catch (error: any) {
      console.error("❌ Failed to submit profile", error);
      Alert.alert("Submission error", error?.message || "Network request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Top bar with back + dots */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (currentIndex === 0) {
              router.back();
            } else {
              swiperRef.current?.scrollBy(-1);
            }
          }}
        >
          <AntDesign name="arrowleft" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.dots}>
          {[0, 1, 2, 3, 4, 5].map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.activeDot]} />
          ))}
        </View>
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

        {/* SLIDE 2 - Niches */}
        <ScrollView contentContainerStyle={[styles.container, { alignItems: "stretch" }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Choose Your Niche</Text>
          <Text style={styles.subtext}>Select your primary category and related sub-niches</Text>
          {Object.entries(categoriesData).map(([category, subs]) => (
            <View key={category} style={styles.categoryBox}>
              <TouchableOpacity
                onPress={() => {
                  if (expandedCategories.includes(category)) {
                    setExpandedCategories(expandedCategories.filter((c) => c !== category));
                  } else {
                    setExpandedCategories([...expandedCategories, category]);
                  }
                }}
                style={styles.categoryHeader}
              >
                <TouchableOpacity onPress={() => toggleCategory(category)}>
                  <View style={styles.checkbox}>
                    {selectedCategories.includes(category) && <View style={styles.checkboxSelected} />}
                  </View>
                </TouchableOpacity>
                <Text onPress={() => toggleCategory(category)} style={styles.categoryText}>
                  {category}
                </Text>
                <AntDesign name={expandedCategories.includes(category) ? "up" : "down"} size={18} color="#666" />
              </TouchableOpacity>

              {expandedCategories.includes(category) && (
                <View style={styles.subCategoryContainer}>
                  {subs.map((sub, index) => (
                    <TouchableOpacity key={index} style={styles.subCategoryBox} onPress={() => toggleSubcategory(category, sub)}>
                      <View style={styles.checkbox}>
                        {selectedSubcategories[category]?.includes(sub) && <View style={styles.checkboxSelected} />}
                      </View>
                      <Text style={styles.subCategoryText}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
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
                  placeholder={`Your ${item.label}`}
                  value={item.value}
                  onChangeText={(text) => {
                    const updated = [...socials];
                    updated[idx].value = text;
                    setSocials(updated);
                  }}
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

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', padding: 20, paddingTop: 35, alignItems: 'center' },
  avatarContainer: { position: 'relative', marginBottom: 30 },
  avatar: { width: 120, height: 120, resizeMode: 'contain', borderRadius: 60 },
  editIcon: { position: 'absolute', bottom: 13, right: 11, width: 24, height: 24, resizeMode: 'contain' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#9333EA', marginBottom: 20, textAlign: 'center' },
  label: { alignSelf: 'flex-start', fontSize: 14, marginBottom: 6, color: '#333' },
  subtext: { textAlign: 'center', fontSize: 14, color: '#333', marginBottom: 20 },
  textArea: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 10, minHeight: 100, marginBottom: 30, textAlignVertical: 'top' },
  button: { borderRadius: 10, overflow: 'hidden', marginTop: 30, alignSelf: 'center' },
  gradient: { paddingVertical: 14, paddingHorizontal: 70, alignItems: 'center', borderRadius: 10 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  placeholderText: { fontSize: 20, color: '#999', marginBottom: 20 },
  backButton: { position: 'absolute', top: 0, left: 10, zIndex: 10, padding: 20 },

  categoryBox: { width: '100%', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  categoryText: { flex: 1, color: '#9333EA', fontSize: 16, fontWeight: '500' },
  subCategoryContainer: { paddingBottom: 10, gap: 10 },
  subCategoryBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginVertical: 4 },
  subCategoryText: { fontSize: 14, color: '#444' },
  checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: '#aaa', backgroundColor: '#fff', borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { width: 10, height: 10, backgroundColor: '#9333EA', borderRadius: 2 },

  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ccc' },
  activeDot: { backgroundColor: '#A855F7' },

  purposeCard: { width: '47%', aspectRatio: 1, borderWidth: 1, borderColor: '#aaa', borderRadius: 10, padding: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 15, position: 'relative' },
  purposeIcon: { width: 40, height: 40, marginBottom: 10, resizeMode: 'contain' },
  purposeText: { fontSize: 12, textAlign: 'center', color: '#000' },
  cardSelected: { borderColor: '#9333EA', borderWidth: 2 },

  collabContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 30 },
  collabCard: { width: '30%', aspectRatio: 1, borderWidth: 1, borderColor: '#aaa', borderRadius: 10, padding: 10, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  collabCheckboxWrapper: { position: 'absolute', top: 8, left: 8, zIndex: 2 },

  socialRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  socialIcon: { width: 22, height: 22, resizeMode: 'contain' },
  socialLabel: { fontSize: 15, color: '#000' },

  checkIcon: { width: 100, height: 100, marginVertical: 30, resizeMode: 'contain' },
  completeText: { fontSize: 16, textAlign: 'center', color: '#000', marginBottom: 40 },

  topBar: {
    backgroundColor: '#fff',
    height: 50,
    paddingTop: 25,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 999,
    position: 'relative',
  },
  dots: { flexDirection: 'row', gap: 8 },

  purposeCardCheckboxWrapper: { position: 'absolute', top: 8, left: 8, zIndex: 1 },
  cardCheckboxWrapper: { position: 'absolute', top: 8, left: 8, zIndex: 2 },
});
