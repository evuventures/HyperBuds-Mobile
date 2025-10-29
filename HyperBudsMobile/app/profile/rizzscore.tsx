// app/rizzscore.tsx
import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const RizzScore = () => {
  const router = useRouter();
  const [showHistory, setShowHistory] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#444" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>HyperBuds</Text>
          <Ionicons name="menu" size={22} color="#444" />
        </View>

        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Text style={styles.progressLabel}>Steady Growth</Text>
            <TouchableOpacity onPress={() => setShowHistory(true)}>
              <Ionicons name="refresh" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "44%" }]} />
          </View>
          <Text style={styles.scoreTitle}>Your Rizz Score</Text>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>54</Text>
          </View>
          <TouchableOpacity style={styles.recentButton} onPress={() => setShowHistory(true)}>
            <Text style={styles.recentButtonText}>Recent Score History</Text>
          </TouchableOpacity>
        </View>

        {/* Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <View style={[styles.metricIconBadge, { backgroundColor: "#FFE8F0" }]}>
              <Ionicons name="heart" size={18} color="#FF4081" />
            </View>
            <View style={styles.metricBadge}>
              <Text style={styles.metricBadgeText}>+5%</Text>
            </View>
            <Text style={styles.metricValue}>0.0%</Text>
            <Text style={styles.metricLabel}>Engagement</Text>
          </View>

          <View style={styles.metricBox}>
            <View style={[styles.metricIconBadge, { backgroundColor: "#D1FAE5" }]}>
              <Ionicons name="trending-up" size={18} color="#10B981" />
            </View>
            <View style={styles.metricBadge}>
              <Text style={styles.metricBadgeText}>+5%</Text>
            </View>
            <Text style={[styles.metricValue, { color: "#10B981" }]}>5.8%</Text>
            <Text style={styles.metricLabel}>Growth</Text>
          </View>

          <View style={styles.metricBox}>
            <View style={[styles.metricIconBadge, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="people" size={18} color="#EF4444" />
            </View>
            <View style={styles.metricBadge}>
              <Text style={styles.metricBadgeText}>+0%</Text>
            </View>
            <Text style={[styles.metricValue, { color: "#EF4444" }]}>0</Text>
            <Text style={styles.metricLabel}>Collaboration</Text>
          </View>

          <View style={styles.metricBox}>
            <View style={[styles.metricIconBadge, { backgroundColor: "#F3E8FF" }]}>
              <Ionicons name="star" size={18} color="#C084FC" />
            </View>
            <View style={styles.metricBadge}>
              <Text style={styles.metricBadgeText}>+8%</Text>
            </View>
            <Text style={[styles.metricValue, { color: "#9333EA" }]}>76.0</Text>
            <Text style={styles.metricLabel}>Quality</Text>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.leaderboardButton}>
          <Text style={styles.leaderboardText}>View Leaderboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.rankBox}>
          <Ionicons name="stats-chart" size={18} color="#555" />
          <Text style={styles.rankText}>
            See How You Rank with top creators
          </Text>
        </TouchableOpacity>

        {/* Stats Boxes - Redesigned */}
        <View style={styles.statsGrid}>
          <View style={[styles.newStatCard, { backgroundColor: "#E879F9" }]}>
            <View style={styles.statCardHeader}>
              <Ionicons name="calendar" size={20} color="#FFF" />
            </View>
            <Text style={styles.newStatLabel}>Content Frequency</Text>
            <View style={styles.statCardFooter}>
              <Text style={styles.followerLabel}>Total Followers</Text>
              <Text style={styles.followerValue}>22</Text>
            </View>
          </View>

          <View style={[styles.newStatCard, { backgroundColor: "#A78BFA" }]}>
            <View style={styles.statCardHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            </View>
            <Text style={styles.newStatLabel}>Consistency</Text>
            <View style={styles.statCardFooter}>
              <Text style={styles.followerLabel}>Total Followers</Text>
              <Text style={styles.followerValue}>40.8%</Text>
            </View>
          </View>

          <View style={[styles.newStatCard, { backgroundColor: "#FCD34D" }]}>
            <View style={styles.statCardHeader}>
              <Ionicons name="analytics" size={20} color="#FFF" />
            </View>
            <Text style={styles.newStatLabel}>Engagement Rate</Text>
            <View style={styles.statCardFooter}>
              <Text style={styles.followerLabel}>Total Followers</Text>
              <Text style={styles.followerValue}>0.0%</Text>
            </View>
          </View>

          <View style={[styles.newStatCard, { backgroundColor: "#1F2937" }]}>
            <View style={styles.statCardHeader}>
              <Ionicons name="time" size={20} color="#FFF" />
            </View>
            <Text style={styles.newStatLabel}>Last Updated</Text>
            <View style={styles.statCardFooter}>
              <Text style={styles.followerLabel}>03:21 AM 10/21/2025</Text>
            </View>
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsContainer}>
          <View style={styles.tipsHeader}>
            <Ionicons name="star" size={20} color="#C084FC" />
            <Text style={styles.tipsTitle}>Tips to improve your Rizz Score</Text>
          </View>
          <Text style={styles.tipsSubtitle}>
            Based on your Current Performance
          </Text>

          <Text style={styles.sectionHeader}>Content Strategy</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Post consistently to maintain engagement.</Text>
            <Text style={styles.bullet}>• Use trending hashtags and topics.</Text>
            <Text style={styles.bullet}>• Engage with your audience regularly.</Text>
          </View>

          <Text style={styles.sectionHeader}>Growth Tips</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Collaborate with other creators.</Text>
            <Text style={styles.bullet}>• Cross-promote across platforms.</Text>
            <Text style={styles.bullet}>• Analyze your best-performing content.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Score History Modal */}
      <Modal
        visible={showHistory}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Ionicons name="refresh" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Recent Score History.</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Ionicons name="close-circle" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="bulb" size={20} color="#F59E0B" />
              <Text style={styles.infoText}>
                These are automated score calculations that happen periodically to track your progress over time.
              </Text>
            </View>

            {/* Score History List */}
            <ScrollView style={styles.historyList}>
              <View style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <View style={styles.redDot} />
                  <Text style={styles.historyDate}>9/27/2025</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyScore}>38</Text>
                  <Text style={styles.historyLabel}>Automated</Text>
                </View>
              </View>

              <View style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <View style={styles.redDot} />
                  <Text style={styles.historyDate}>9/28/2025</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyScore}>45</Text>
                  <Text style={styles.historyLabel}>Automated</Text>
                </View>
              </View>

              <View style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <View style={styles.redDot} />
                  <Text style={styles.historyDate}>9/28/2025</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyScore}>54</Text>
                  <Text style={styles.historyLabel}>Automated</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default RizzScore;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  scoreCard: {
    backgroundColor: "#FAF5FF",
    borderRadius: 16,
    marginHorizontal: 18,
    padding: 16,
    marginBottom: 14,
  },
  scoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 13,
    color: "#555",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E9D5FF",
    borderRadius: 10,
    marginTop: 6,
  },
  progressFill: {
    height: 6,
    backgroundColor: "#C084FC",
    borderRadius: 10,
  },
  scoreTitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginVertical: 10,
  },
  scoreCircle: {
    alignSelf: "center",
    backgroundColor: "#F3E8FF",
    borderRadius: 50,
    width: 70,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#9333EA",
  },
  recentButton: {
  alignSelf: "center",
  marginTop: 12,
  backgroundColor: "#F3E8FF",
  paddingHorizontal: 24,
  paddingVertical: 10,
  borderRadius: 14,
  minWidth: 180,
},
recentButtonText: {
  fontSize: 13,
  color: "#9333EA",
  fontWeight: "600",
  textAlign: "center",
},
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 18,
    marginBottom: 16,
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  metricIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metricBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#10B981",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF4081",
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "center",
  },
  leaderboardButton: {
    backgroundColor: "#FEF3C7",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  leaderboardText: {
    color: "#92400E",
    fontWeight: "600",
  },
  rankBox: {
    flexDirection: "row",
    backgroundColor: "#FEF9C3",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 18,
    marginBottom: 18,
    alignItems: "center",
  },
  rankText: {
    marginLeft: 8,
    color: "#444",
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 18,
    marginBottom: 10,
    gap: 10,
  },
  newStatCard: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    justifyContent: "space-between",
  },
  statCardHeader: {
    alignItems: "flex-start",
    marginBottom: 8,
  },
  newStatLabel: {
    fontSize: 13,
    color: "#FFF",
    fontWeight: "600",
    marginBottom: 12,
  },
  statCardFooter: {
    marginTop: "auto",
  },
  followerLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 2,
  },
  followerValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  tipsContainer: {
    backgroundColor: "#FAF5FF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 18,
    marginVertical: 20,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
    color: "#333",
  },
  tipsSubtitle: {
    fontSize: 12,
    color: "#777",
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    marginTop: 10,
    marginBottom: 6,
  },
  bulletList: {
    marginLeft: 8,
  },
  bullet: {
    fontSize: 13,
    color: "#555",
    marginBottom: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  infoBanner: {
    flexDirection: "row",
    backgroundColor: "#E0F2FE",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#0369A1",
    marginLeft: 8,
    lineHeight: 18,
  },
  historyList: {
    maxHeight: 300,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    marginRight: 10,
  },
  historyDate: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  historyRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyScore: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EF4444",
    marginRight: 8,
  },
  historyLabel: {
    fontSize: 12,
    color: "#999",
  },
});