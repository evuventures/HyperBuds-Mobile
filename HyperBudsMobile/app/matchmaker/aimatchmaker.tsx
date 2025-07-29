// app/matchmaker/aimatchmaker.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
// card width as before, but bump height by 10%
const CARD_WIDTH = (width - 48) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.1;

export default function AIMatchmakerScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'Matches' | 'For You'>('Matches');

  const names = ['Lavender', 'Adithya', 'Amy', 'Haewon'];
  const subtitles = [
    'Artist | Musician',
    'Influencer | Artist',
    'Stylist | Model',
    'Influencer | Model',
  ];
  const matches = ['100%', '96%', '82%', '73%'];

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {/* TODO: search */}}>
          <Feather name="search" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoPlaceholder}>
          <Ionicons name="people-outline" size={48} color="#A855F7" />
        </View>

        <Text style={styles.title}>Discovery</Text>
        <Text style={styles.subtitle}>Designed to fit your niches</Text>

        {/* Segment control */}
        <View style={styles.segment}>
          {(['Matches', 'For You'] as const).map((label) => (
            <TouchableOpacity
              key={label}
              onPress={() => setTab(label)}
              style={[
                styles.segmentButton,
                tab === label && styles.segmentButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  tab === label && styles.segmentTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cards grid */}
        <View style={styles.grid}>
          {names.map((name, i) => (
            <View key={i} style={styles.card}>
              {/* taller placeholder */}
              <View style={[styles.imagePlaceholder, { height: CARD_HEIGHT }]} />

              {/* Gradient match badge */}
              <LinearGradient
                colors={['#9333EA', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.matchBadge}
              >
                <Text style={styles.matchBadgeText}>{matches[i]} Match</Text>
              </LinearGradient>

              {/* Top icons */}
              <Ionicons
                name="eye-outline"
                size={20}
                color="#fff"
                style={styles.eyeIcon}
              />
              <Ionicons
                name="location-sharp"
                size={20}
                color="#fff"
                style={styles.pinIcon}
              />

              {/* Name & subtitle */}
              <Text style={styles.cardName}>{name}</Text>
              <Text style={styles.cardSubtitle}>{subtitles[i]}</Text>

              {/* Action icon */}
              <TouchableOpacity style={styles.actionIcon}>
                <MaterialCommunityIcons
                  name="handshake-outline"
                  size={20}
                  color="#A855F7"
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9333EA',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    marginBottom: 16,
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  segmentButtonActive: {
    backgroundColor: '#F3E8FF',
  },
  segmentText: {
    fontSize: 14,
    color: '#666',
  },
  segmentTextActive: {
    color: '#9333EA',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  imagePlaceholder: {
    width: '100%',
    backgroundColor: '#EEE',
  },
  matchBadge: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  matchBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  eyeIcon: {
    position: 'absolute',
    top: 8,
    left: 3,
  },
  pinIcon: {
    position: 'absolute',
    top: 8,
    right: 3,
  },
  cardName: {
    marginTop: 8,
    marginHorizontal: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 8,
    marginBottom: 8,
  },
  actionIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    padding: 6,
  },
});
