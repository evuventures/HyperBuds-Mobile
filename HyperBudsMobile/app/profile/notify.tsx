import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function Notify() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Recent Activities */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.bellIcon}>🔔</Text>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
          </View>

          {/* Activity Item 1 */}
          <View style={styles.activityItem}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>SC</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityName}>Sarah Chen</Text>
              <Text style={styles.activityMessage}>Sent you a friend request</Text>
              <Text style={styles.activityTime}>2m ago</Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.acceptButton}>
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineButton}>
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Activity Item 2 */}
          <View style={[styles.activityItem, { marginTop: 16 }]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>SC</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityName}>Sarah Chen</Text>
              <Text style={styles.activityMessage}>Sent you a friend request</Text>
              <Text style={styles.activityTime}>2m ago</Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.acceptButton}>
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineButton}>
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Today's Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Today's Summary</Text>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#8B5CF6' }]}>1</Text>
              <Text style={styles.summaryLabel}>Someone Today</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#10B981' }]}>3</Text>
              <Text style={styles.summaryLabel}>New Updates</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#F59E0B' }]}>2</Text>
              <Text style={styles.summaryLabel}>Live Mins</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#3B82F6' }]}>1</Text>
              <Text style={styles.summaryLabel}>Collabs Jumping Soon</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.findFriendsButton}>
            <Text style={styles.findFriendsIcon}>👥</Text>
            <Text style={styles.findFriendsText}>Find Friends</Text>
          </TouchableOpacity>
        </View>

        {/* Trending Now */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.trendingIcon}>📈</Text>
            <Text style={styles.sectionTitle}>Trending Now</Text>
          </View>

          <View style={styles.trendingItem}>
            <Text style={styles.trendingHashtag}>#MusicProduction</Text>
            <View style={styles.trendingStats}>
              <Text style={styles.trendingPosts}>2.4k posts</Text>
              <Text style={styles.trendingPercentage}>+24%</Text>
            </View>
          </View>

          <View style={styles.trendingItem}>
            <Text style={styles.trendingHashtag}>#CreatorTips</Text>
            <View style={styles.trendingStats}>
              <Text style={styles.trendingPosts}>1.8k posts</Text>
              <Text style={styles.trendingPercentage}>+18%</Text>
            </View>
          </View>

          <View style={styles.trendingItem}>
            <Text style={styles.trendingHashtag}>#Live Streaming</Text>
            <View style={styles.trendingStats}>
              <Text style={styles.trendingPosts}>1.2k posts</Text>
              <Text style={styles.trendingPercentage}>+15%</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All Trends</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    marginRight: 16,
  },
  backIcon: {
    fontSize: 24,
    color: '#000',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bellIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  trendingIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  activityContent: {
    flex: 1,
    marginRight: 8,
  },
  activityName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  activityMessage: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  acceptButtonText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '500',
  },
  declineButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  declineButtonText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 16,
  },
  summaryItem: {
    width: '50%',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryNumber: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  findFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    paddingVertical: 12,
  },
  findFriendsIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  findFriendsText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  trendingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendingHashtag: {
    fontSize: 14,
    color: '#374151',
  },
  trendingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendingPosts: {
    fontSize: 13,
    color: '#6B7280',
  },
  trendingPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  viewAllButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8B5CF6',
  },
});