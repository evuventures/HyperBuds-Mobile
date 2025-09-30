// app/dev.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";

export default function Dev() {
  const router = useRouter();

  const pages = [
    { label: "Login", path: "/login&signup/login" },
    { label: "Signup", path: "/login&signup/signup" },
    { label: "Build Profile", path: "/registration/buildprofile" }, // important one
    { label: "Profile", path: "/profile/profile" },
    { label: "AI Matchmaker", path: "/main/matchmaker/aimatchmaker" },
    { label: "Explore", path: "/main/explore" },
    {label:"onboarding", path: "/registration/onboarding"}
    // add more routes here as needed
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Dev Navigation</Text>

        {pages.map((p, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.button}
            onPress={() => {
              // cast to any so TypeScript doesn't complain about dynamic route strings
              router.push(p.path as any);
            }}
          >
            <Text style={styles.buttonText}>{p.label}</Text>
            <Text style={styles.pathText}>{p.path}</Text>
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: {
    padding: 16,
    paddingTop: 28,
    alignItems: "stretch",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 18,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#101827",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  pathText: {
    color: "#CBD5E1",
    fontSize: 12,
    marginTop: 6,
  },
});
