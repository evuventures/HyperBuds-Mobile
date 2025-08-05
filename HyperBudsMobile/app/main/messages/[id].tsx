// app/main/messages/[id].tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, AntDesign } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

type Message = { id: string; text: string; fromMe: boolean };

const CONVERSATIONS: Record<string, { status: string; messages: Message[] }> = {
  '1': {
    status: 'Last Active at 8:32 PM',
    messages: [
      { id: 'm1', text: 'Hey! What’s new at work?', fromMe: false },
      { id: 'm1a', text: 'Just shipped our new feature!', fromMe: true },
    ],
  },
  '2': {
    status: 'Last Active at 12:03 PM',
    messages: [
      { id: 'm2', text: 'Today was a long day right?', fromMe: false },
      { id: 'm2a', text: 'You have no idea 😅', fromMe: true },
    ],
  },
  '3': {
    status: 'Last Active at 9:24 AM',
    messages: [
      { id: 'm3', text: 'Wanna work on a new Collaboration to…', fromMe: false },
      { id: 'm3a', text: 'Absolutely, let’s chat details.', fromMe: true },
    ],
  },
};

const HEADER_HEIGHT = 80;
const INPUT_SIZE = 40;
const { width } = Dimensions.get('window');

export default function ChatScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const convo = CONVERSATIONS[id] || { status: '', messages: [] };

  return (
    <View style={styles.container}>
      {/* extend gradient under status bar */}
      <StatusBar translucent backgroundColor="transparent" style="light" />

      <LinearGradient
        colors={['#9333EA', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.header,
          {
            paddingTop: Constants.statusBarHeight,
            height: Constants.statusBarHeight + HEADER_HEIGHT,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.avatarPlaceholder} />

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userStatus}>{convo.status}</Text>
        </View>

        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="call" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <Feather name="more-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.messagesContainer}>
        {convo.messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.bubble,
              msg.fromMe ? styles.bubbleRight : styles.bubbleLeft,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                msg.fromMe && styles.bubbleTextRight,
              ]}
            >
              {msg.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.actionBtn, styles.plusBtn]}>
          <AntDesign name="plus" size={20} color="#fff" />
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { height: INPUT_SIZE }]}
          placeholder="Message..."
          placeholderTextColor="#AAA"
        />

        <TouchableOpacity style={[styles.actionBtn, styles.sendBtn]}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  iconBtn: { padding: 8 },

  avatarPlaceholder: {
    width: HEADER_HEIGHT - 30,
    height: HEADER_HEIGHT - 30,
    borderRadius: (HEADER_HEIGHT - 16) / 2,
    backgroundColor: '#ddd',
    marginHorizontal: 8,
  },

  userInfo: { flex: 1 },
  userName: { color: '#fff', fontSize: 18, fontWeight: '600' },
  userStatus: { color: '#F0F0F0', fontSize: 12 },

  messagesContainer: { padding: 16, flexGrow: 1 },

  bubble: {
    maxWidth: width * 0.7,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 6,
  },
  bubbleLeft: { alignSelf: 'flex-start', backgroundColor: '#E5E5EA' },
  bubbleRight: { alignSelf: 'flex-end', backgroundColor: '#3B82F6' },
  bubbleText: { color: '#000' },
  bubbleTextRight: { color: '#fff' },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#EEE',
  },
  actionBtn: {
    width: INPUT_SIZE,
    height: INPUT_SIZE,
    borderRadius: INPUT_SIZE / 2,
    backgroundColor: '#9333EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusBtn: { marginRight: 8 },
  sendBtn: { marginLeft: 8 },

  input: {
    flex: 1,
    borderRadius: INPUT_SIZE / 2,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
  },
});
