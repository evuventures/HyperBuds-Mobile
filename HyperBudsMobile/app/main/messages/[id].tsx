// app/main/messages/[id].tsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather, AntDesign } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HEADER_HEIGHT = 80;
const INPUT_SIZE = 40;
const { width } = Dimensions.get("window");

/** === API base === */
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || "").trim() ||
  "https://api-hyperbuds-backend.onrender.com/api/v1";

/** === Types (based on your docs) === */
type ApiParticipant = { _id: string; email?: string };
type ApiMessage = {
  _id: string;
  conversationId: string;
  sender: { _id: string; email?: string };
  content: string;
  type: "text" | "image" | "file" | "collab_invite";
  attachments?: any[];
  isRead?: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

type ApiConversation = {
  _id: string;
  participants: ApiParticipant[];
  type: "direct" | "group";
  lastMessage?: { _id: string; content: string; sender?: string; createdAt: string } | null;
  lastActivity?: string;
  createdAt?: string;
};

type ChatMessage = { id: string; text: string; fromMe: boolean; createdAtISO?: string };

/** === Auth fetch with refresh === */
async function fetchWithAuth(url: string, init: RequestInit = {}) {
  const accessToken = await AsyncStorage.getItem("accessToken");
  const refreshToken = await AsyncStorage.getItem("refreshToken");

  const doFetch = (token?: string) =>
    fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res = await doFetch(accessToken || undefined);
  if (res.status !== 401) return res;

  if (!refreshToken) return res;
  const r = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: refreshToken }),
  });
  if (!r.ok) return res;
  const { accessToken: newAccess } = await r.json();
  await AsyncStorage.setItem("accessToken", newAccess);
  res = await doFetch(newAccess);
  return res;
}

/** === Utilities === */
function mapApiMessage(m: ApiMessage, meId?: string | null): ChatMessage {
  return {
    id: String(m._id),
    text: m.content ?? "",
    fromMe: meId ? String(m.sender?._id) === String(meId) : false,
    createdAtISO: m.createdAt,
  };
}

function timeLabel(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

async function getMeId(): Promise<string | null> {
  try {
    const res = await fetchWithAuth(`${API_BASE}/users/me`);
    if (!res.ok) return null;
    const data = await res.json();
    const id =
      data?.user?._id ||
      data?.user?.id ||
      data?.profile?.userId ||
      data?.profile?.user?.id;
    return id ? String(id) : null;
  } catch {
    return null;
  }
}

/** === Screen === */
export default function ChatScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();

  const [meId, setMeId] = useState<string | null>(null);
  const [conv, setConv] = useState<ApiConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [nextPage, setNextPage] = useState<number | null>(2); // after initial page=1
  const [initialLoaded, setInitialLoaded] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);

  const displayName = useMemo(
    () => (name ? decodeURIComponent(String(name)) : "Conversation"),
    [name]
  );

  const headerSubtitle = useMemo(() => {
    const last = conv?.lastActivity || conv?.lastMessage?.createdAt || conv?.createdAt;
    return last ? `Last active ${timeLabel(last)}` : "Chat";
  }, [conv]);

  const otherParticipant = useMemo(() => {
    if (!conv?.participants || !meId) return null;
    return conv.participants.find((p) => String(p._id) !== String(meId)) || conv.participants[0] || null;
  }, [conv, meId]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const loadConversationMeta = useCallback(async () => {
    if (!id) return;
    const res = await fetchWithAuth(`${API_BASE}/conversations/${encodeURIComponent(String(id))}`);
    if (!res.ok) throw new Error("Failed to load conversation");
    const data = await res.json();
    const c: ApiConversation = data?.conversation || data;
    setConv(c);
  }, [id]);

  const loadMessagesPage = useCallback(
    async (page = 1, limit = 50) => {
      if (!id) return { items: [] as ChatMessage[], next: null as number | null };
      const res = await fetchWithAuth(
        `${API_BASE}/conversations/${encodeURIComponent(String(id))}/messages?page=${page}&limit=${limit}`,
        { method: "GET" }
      );
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Failed to load messages");
      }
      const data = (await res.json()) as { messages?: ApiMessage[] };
      const arr = (data?.messages || []).map((m) => mapApiMessage(m, meId));

      // Ensure oldest -> newest order for UI
      arr.sort((a, b) => {
        const ta = a.createdAtISO ? Date.parse(a.createdAtISO) : 0;
        const tb = b.createdAtISO ? Date.parse(b.createdAtISO) : 0;
        return ta - tb;
      });

      const next = arr.length === limit ? page + 1 : null;
      return { items: arr, next };
    },
    [id, meId]
  );

  const markRead = useCallback(async () => {
    if (!id) return;
    try {
      await fetchWithAuth(`${API_BASE}/conversations/${encodeURIComponent(String(id))}/read`, {
        method: "PUT",
        body: JSON.stringify({ messageIds: [] }), // empty marks ALL as read per docs
      });
    } catch {
      // best-effort; ignore errors
    }
  }, [id]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const myId = await getMeId();
      setMeId(myId);
      await loadConversationMeta();

      const { items, next } = await loadMessagesPage(1);
      setMessages(items);
      setNextPage(next);
      setInitialLoaded(true);

      // mark as read when opening
      markRead();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load chat.");
    } finally {
      setLoading(false);
      setTimeout(scrollToEnd, 50);
    }
  }, [loadConversationMeta, loadMessagesPage, markRead, scrollToEnd]);

  const loadOlder = useCallback(async () => {
    if (!nextPage) return;
    try {
      const { items, next } = await loadMessagesPage(nextPage);
      if (items.length > 0) {
        setMessages((prev) => [...items, ...prev]); // prepend older
      }
      setNextPage(next);
    } catch {
      // ignore
    }
  }, [nextPage, loadMessagesPage]);

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);

    // optimistic
    const optimistic: ChatMessage = {
      id: `tmp_${Date.now()}`,
      text,
      fromMe: true,
      createdAtISO: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    scrollToEnd();

    try {
      const res = await fetchWithAuth(
        `${API_BASE}/conversations/${encodeURIComponent(String(id))}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content: text, type: "text" }),
        }
      );
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Failed to send message");
      }
      const data = await res.json();
      const saved: ApiMessage = data?.message || data;
      const mapped = mapApiMessage(saved, meId);

      // replace optimistic with real
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? mapped : m)));

      // update header subtitle
      setConv((prev) =>
        prev
          ? {
              ...prev,
              lastMessage: {
                _id: saved._id,
                content: saved.content,
                sender: saved.sender?._id,
                createdAt: saved.createdAt,
              },
              lastActivity: saved.createdAt,
            }
          : prev
      );
    } catch (e: any) {
      // rollback optimistic
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text); // put it back for retry
      Alert.alert("Send failed", e?.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  }, [id, input, meId, sending, scrollToEnd]);

  useFocusEffect(
    useCallback(() => {
      loadInitial();
    }, [loadInitial])
  );

  /** === UI === */
  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View
      style={[
        styles.bubble,
        item.fromMe ? styles.bubbleRight : styles.bubbleLeft,
      ]}
    >
      <Text style={[styles.bubbleText, item.fromMe && styles.bubbleTextRight]}>
        {item.text}
      </Text>
      {!!item.createdAtISO && (
        <Text style={[styles.time, item.fromMe && styles.timeRight]}>
          {timeLabel(item.createdAtISO)}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" style="light" />

      {/* Header */}
      <LinearGradient
        colors={["#9333EA", "#3B82F6"]}
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

        {/* Optional avatar for the other participant (hydrate later if you wish) */}
        <View style={styles.avatarPlaceholder}>
          {otherParticipant?.email ? (
            <Initials text={otherParticipant.email} />
          ) : (
            <Initials text={displayName} />
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.userStatus}>{headerSubtitle}</Text>
        </View>

        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="call" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <Feather name="more-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.messagesContainer}
            ListHeaderComponent={
              nextPage ? (
                <TouchableOpacity style={styles.loadOlder} onPress={loadOlder}>
                  <Text style={styles.loadOlderText}>Load older</Text>
                </TouchableOpacity>
              ) : null
            }
            onContentSizeChange={() => {
              if (!initialLoaded) return;
              scrollToEnd();
            }}
          />

          <KeyboardAvoidingView
            behavior={Platform.select({ ios: "padding", android: undefined })}
            keyboardVerticalOffset={Platform.select({
              ios: Constants.statusBarHeight + 44,
              android: 0,
            })}
          >
            <View style={styles.footer}>
              <TouchableOpacity style={[styles.actionBtn, styles.plusBtn]}>
                <AntDesign name="plus" size={20} color="#fff" />
              </TouchableOpacity>

              <TextInput
                style={[styles.input, { height: INPUT_SIZE }]}
                placeholder="Message..."
                placeholderTextColor="#AAA"
                value={input}
                onChangeText={setInput}
                editable={!sending}
                returnKeyType="send"
                onSubmitEditing={onSend}
              />

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.sendBtn,
                  !input.trim() && { opacity: 0.5 },
                ]}
                onPress={onSend}
                disabled={!input.trim() || sending}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </>
      )}
    </View>
  );
}

/** === Initials for tiny avatar === */
function Initials({ text }: { text: string }) {
  const initials = useMemo(() => {
    return text
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || "")
      .join("");
  }, [text]);

  return (
    <View style={styles.initialsCircle}>
      <Text style={styles.initialsText}>{initials || "?"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  iconBtn: { padding: 8 },

  avatarPlaceholder: {
    width: HEADER_HEIGHT - 30,
    height: HEADER_HEIGHT - 30,
    borderRadius: (HEADER_HEIGHT - 16) / 2,
    backgroundColor: "#E9D5FF",
    marginHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  initialsCircle: {
    width: HEADER_HEIGHT - 38,
    height: HEADER_HEIGHT - 38,
    borderRadius: (HEADER_HEIGHT - 38) / 2,
    backgroundColor: "#F5F3FF",
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: { color: "#6B21A8", fontWeight: "700" },

  userInfo: { flex: 1 },
  userName: { color: "#fff", fontSize: 18, fontWeight: "600" },
  userStatus: { color: "#F0F0F0", fontSize: 12 },

  messagesContainer: { padding: 16, paddingBottom: 4 },

  bubble: {
    maxWidth: width * 0.75,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 6,
  },
  bubbleLeft: { alignSelf: "flex-start", backgroundColor: "#E5E5EA" },
  bubbleRight: { alignSelf: "flex-end", backgroundColor: "#3B82F6" },
  bubbleText: { color: "#000", fontSize: 15 },
  bubbleTextRight: { color: "#fff" },
  time: { fontSize: 10, color: "#666", marginTop: 6 },
  timeRight: { color: "#E5E7EB" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: "#EEE",
    backgroundColor: "#fff",
  },
  actionBtn: {
    width: INPUT_SIZE,
    height: INPUT_SIZE,
    borderRadius: INPUT_SIZE / 2,
    backgroundColor: "#9333EA",
    justifyContent: "center",
    alignItems: "center",
  },
  plusBtn: { marginRight: 8 },
  sendBtn: { marginLeft: 8 },

  input: {
    flex: 1,
    borderRadius: INPUT_SIZE / 2,
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 16,
  },

  loadOlder: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    marginBottom: 8,
  },
  loadOlderText: { color: "#111827", fontWeight: "600" },
});
