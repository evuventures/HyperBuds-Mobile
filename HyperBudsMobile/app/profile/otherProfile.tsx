// app/profile/otherProfile.tsx

import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function OtherProfile() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Banner placeholder */}
        <View style={styles.banner} />

        {/* Back arrow without circle */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>

        {/* Avatar placeholder */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar} />
        </View>

        {/* Username & Role */}
        <Text style={styles.username}>@LaughyLav</Text>
        <Text style={styles.role}>Creator and Socials Specialist</Text>

        {/* Follow button */}
        <TouchableOpacity style={styles.followButton}>
          <Text style={styles.followText}>Follow</Text>
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>12K</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>Collaborations</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>200</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          I am a hard working, 22 year old woman who tries her hardest to create an incredible space for other content creators to learn and grow.
        </Text>

        {/* Collaborations */}
        <Text style={styles.sectionTitle}>Collaborations</Text>
        <View style={styles.collabImage} />
        <TouchableOpacity style={styles.collabItem}>
          <Text style={styles.collabTitle}>
            Andy & Sam Podcast: Time to Learn the Art of Makeup
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#666" />
        </TouchableOpacity>

        {/* Example Post */}
        <View style={styles.postRow}>
          <View style={styles.postAvatar} />
          <View style={styles.postInfo}>
            <Text style={styles.postAuthors}>Tom & Mon</Text>
            <Text style={styles.postSub}>Podcast | Podcast</Text>
          </View>
        </View>
        <View style={styles.viewersRow}>
          <View style={styles.viewersBadge}>
            <Text style={styles.viewersCount}>12K</Text>
            <Text style={styles.viewersLabel}>Viewers</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="flame-outline" size={20} color="#E03131" />
            <Text style={styles.metricText}>5K</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="share-social-outline" size={20} color="#339933" />
            <Text style={styles.metricText}>400</Text>
          </View>
        </View>

        {/* Niches */}
        <Text style={styles.sectionTitle}>Niches</Text>
        <View style={styles.tagsRow}>
          <View style={styles.tag}><Text style={styles.tagText}>Artist</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>Musician</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>Advisor</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  banner: {
    width: '100%',
    height: width * 0.5,
    backgroundColor: '#ccc',
    marginBottom: 16,
  },
  backButton: {
    position: 'absolute',
    top: width * 0.5 - 28 - 8, // align on banner
    left: 16,
  },
  avatarWrapper: {
    marginTop: -50,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatar: {
    width: 100,
    height: 100,
    backgroundColor: '#ddd',
  },
  username: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  role: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
  followButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#9333EA',
  },
  followText: { color: '#9333EA', fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
  },
  stat: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  sectionTitle: {
    alignSelf: 'flex-start',
    marginTop: 24,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  aboutText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    textAlign: 'left',
  },
  collabImage: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    backgroundColor: '#ddd',
    marginBottom: 8,
  },
  collabItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
  },
  collabTitle: { fontSize: 14, color: '#333', flex: 1, marginRight: 8 },
  postRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ddd',
  },
  postInfo: { marginLeft: 8 },
  postAuthors: { fontSize: 14, fontWeight: '600', color: '#000' },
  postSub: { fontSize: 12, color: '#666', marginTop: 2 },
  viewersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
  },
  viewersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C4CEB',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  viewersCount: { color: '#fff', fontWeight: '600', marginRight: 4 },
  viewersLabel: { color: '#fff', fontSize: 12 },
  metric: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  metricText: { marginLeft: 4, color: '#333', fontSize: 14 },
  tagsRow: { flexDirection: 'row', justifyContent: 'flex-start', width: '100%', marginTop: 12 },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#EBD7FF',
    marginRight: 8,
  },
  tagText: { fontSize: 12, color: '#9333EA', fontWeight: '500' },
});