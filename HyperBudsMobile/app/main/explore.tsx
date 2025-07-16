// app/main/explore.tsx
import React, { ComponentProps } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

// Exact union type of Ionicons names
type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function Explore() {
  const router = useRouter();

  const features: { key: string; icon: IoniconName; label: string }[] = [
    { key: 'matches',        icon: 'star',               label: 'Matches' },
    { key: 'collaborations', icon: 'hand-left-outline',  label: 'Collaborations' },
    { key: 'marketplace',    icon: 'pricetags',          label: 'Marketplace' },
    { key: 'audience',       icon: 'people',             label: 'Audience' },
  ];

  const avatars = [
    { key: '1', name: 'Tam' },
    { key: '2', name: 'Tum' },
    { key: '3', name: 'Tom' },
    { key: '4', name: 'Sam' },
    { key: '5', name: 'Max' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header with logo and profile icon */}
      <View style={styles.header}>
        <Image source={require('../../assets/images/hblogo.png')} style={styles.logoImage} />
        <TouchableOpacity onPress={() => router.push('/profile/profile')}>
          <Ionicons name="person-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Welcome Banner */}
        <View style={styles.welcomeContainer}>
          <Image source={require('../../assets/images/avatar.png')} style={styles.welcomeAvatar} />
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeTitle}>Welcome Sam_12!</Text>
            <Text style={styles.welcomeSubtitle}>Ready to collab?</Text>
          </View>
          <Ionicons name="arrow-forward" size={24} color="#9333EA" />
        </View>

        {/* Explore Features */}
        <Text style={styles.sectionTitle}>Explore</Text>
        <View style={styles.features}>
          {features.map(f => (
            <View key={f.key} style={styles.featureItem}>
              {f.key === 'collaborations' ? (
                <FontAwesome5 name="handshake" size={24} color="#9333EA" />
              ) : (
                <Ionicons name={f.icon} size={24} color="#9333EA" />
              )}
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Avatar Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.avatarRow}
        >
          {avatars.map(a => (
            <View key={a.key} style={styles.avatarItem}>
              <View style={styles.avatarPlaceholder} />
              <Text style={styles.avatarName}>{a.name}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Trending Section */}
        <Text style={styles.sectionTitle}>Trending</Text>
        {[1, 2, 3].map(i => (
          <View key={i} style={styles.card}>
            <View style={styles.cardImagePlaceholder} />
            <Text style={styles.cardTitle}>
              Tom & Sam Podcast: The AI Edge in Creator Growth
            </Text>
            <Text style={styles.cardSubtitle}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit...
            </Text>

            {/* Author + Stats */}
            <View style={styles.postFooter}>
              <View style={styles.authorRow}>
                <View style={styles.avatarSmall} />
                <View style={styles.avatarSmall} />
                <View style={styles.authorTextWrapper}>
                  <Text style={styles.postAuthor}>Tom & Mon</Text>
                  <Text style={styles.postSubauthor}>Podcast | Podcast</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.viewersPill}>
                  <View style={styles.viewersCountWrapper}>
                    <Text style={styles.viewersCount}>12K</Text>
                  </View>
                  <Text style={styles.viewersLabel}>Viewers</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="flame" size={20} color="red" />
                  <Text style={styles.statText}>5K</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="share-social" size={20} color="green" />
                  <Text style={styles.statText}>400</Text>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.cardDivider} />
          </View>
        ))}

        {/* Recommended for You */}
        <Text style={styles.sectionTitle}>Recommended for You</Text>
        <View style={styles.recoCard}>
          <View style={styles.recoImagePlaceholder} />
          <Text style={styles.recoName}>Angela Brooks</Text>
          <Text style={styles.recoSubtitle}>Gaming Streamer | 12K Followers</Text>
          <Text style={styles.recoMetrics}>
            Audience Overlap: 78%  |  Synergy Score™: 92%
          </Text>
          <View style={styles.recoButtons}>
            <TouchableOpacity style={styles.recoGradientBtn}>
              <LinearGradient
                colors={['#3B82F6', '#9333EA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.recoGradient}
              >
                <Text style={styles.recoBtnText}>View Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.recoSuggestBtn}>
              <Text style={styles.recoSuggestText}>Suggest Collab</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  logoImage: { width: 120, height: 40, resizeMode: 'contain' },

  container: { padding: 20, paddingBottom: 40 },

  welcomeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  welcomeAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ddd', marginRight: 15 },
  welcomeTextContainer: { flex: 1 },
  welcomeTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  welcomeSubtitle: { fontSize: 14, color: '#666' },

  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 15, color: '#000' },

  features: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  featureItem: { width: '45%', flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  featureLabel: { marginLeft: 8, fontSize: 14, color: '#333' },

  avatarRow: { marginBottom: 20 },
  avatarItem: { alignItems: 'center', marginRight: 15 },
  avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ddd' },
  avatarName: { marginTop: 5, fontSize: 12, color: '#333' },

  card: { backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden', marginBottom: 30 },
  cardImagePlaceholder: { width: '100%', height: 180, backgroundColor: '#ddd' },
  cardTitle: { fontSize: 16, fontWeight: '600', margin: 10, color: '#000' },
  cardSubtitle: { fontSize: 12, color: '#666', marginHorizontal: 10, marginBottom: 10 },

  postFooter: { paddingTop: 10, paddingHorizontal: 10, paddingBottom: 15 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ddd', marginRight: -10, borderWidth: 2, borderColor: '#9333EA' },
  authorTextWrapper: { marginLeft: 10 },
  postAuthor: { fontSize: 14, fontWeight: '600', color: '#000' },
  postSubauthor: { fontSize: 12, color: '#666' },

  statsRow: { flexDirection: 'row', alignItems: 'center' },
  viewersPill: { flexDirection: 'row', borderRadius: 20, overflow: 'hidden', backgroundColor: '#000', marginRight: 15 },
  viewersCountWrapper: { backgroundColor: '#3B82F6', paddingHorizontal: 8, justifyContent: 'center' },
  viewersCount: { color: '#fff', fontSize: 12, fontWeight: '600', paddingVertical: 4 },
  viewersLabel: { color: '#fff', fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
  statText: { marginLeft: 4, fontSize: 12, color: '#000' },

  cardDivider: { height: 1, backgroundColor: '#eee', marginHorizontal: 10 },

  recoCard: { backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden', padding: 20, marginBottom: 40 },
  recoImagePlaceholder: { width: '100%', height: 180, backgroundColor: '#ddd', borderRadius: 10 },
  recoName: { fontSize: 16, fontWeight: '600', marginTop: 15, color: '#000' },
  recoSubtitle: { fontSize: 12, color: '#666', marginVertical: 5 },
  recoMetrics: { fontSize: 12, color: '#000', marginBottom: 15 },
  recoButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  recoGradientBtn: { flex: 1, marginRight: 10, borderRadius: 10, overflow: 'hidden' },
  recoGradient: { paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  recoBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  recoSuggestBtn: { flex: 1, backgroundColor: '#000', borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingVertical: 12 },
  recoSuggestText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
