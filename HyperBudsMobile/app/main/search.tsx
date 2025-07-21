// app/main/search.tsx

import React from 'react';
import {
  SafeAreaView,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SearchScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* Back arrow */}
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        {/* Search bar */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#888"
          />
        </View>

        {/* Messages icon */}
        <TouchableOpacity onPress={() => {/* navigate to Messages if desired */}} style={styles.iconButton}>
          <Ionicons name="mail-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* TODO: add your search results or content below */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  iconButton: {
    padding: 8,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    marginHorizontal: 8,
    paddingHorizontal: 8,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 16,
    color: '#333',
  },
});
