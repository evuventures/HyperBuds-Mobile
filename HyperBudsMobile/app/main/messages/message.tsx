// app/main/messages.tsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** === API base (Render) === */
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || "").trim() ||
  "https://api-hyperbuds-backend.onrender.com/api/v1";

/** === Types from the Messaging API (simplified) === */
type ApiParticipant = { _id: string; email?: string };
type ApiMessage = {
  _id: string;
  content: string;
  createdAt: string;
  sender?: { _id: string; email?: string };
};
type ApiConversation = {
  _id: string;
  participants: ApiParticipant[];
  type: "direct" | "group";
  lastMessage?: ApiMessage | null;
  lastActivity?: string;
  unreadCount?: number;
  createdAt?: string;
};

type Thread = {
  id: string;
  otherId?: string | null;
  name: string;
  email?: string;
  avatar?: string | null; // best-effort via profile fetch (lazy)
  snippet?: string;
  timeISO?: string;
  unread?: number;
};

/** === Tokened fetch with auto-refresh === */
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
  return doFetch(newAccess);
}

/** === Get current user id (to compute "other participant") === */
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

/** === Map API conversation -> UI Thread === */
function mapConversationToThread(c: ApiConversation, meId?: string | null): Thread {
  const participants = c.participants || [];
  const other =
    participants.find((p) => String(p._id) !== String(meId || "")) ||
    participants[0];

  const email = other?.email;
  const fallbackName = email
    ? email.split("@")[0]
    : other?._id
    ? `User ${String(other._id).slice(-4)}`
    : "Conversation";

  const last = c.lastMessage || null;
  const snippet = last?.content || undefined;
  const timeISO = last?.createdAt || c.lastActivity || c.createdAt || undefined;

  return {
    id: String(c._id),
    otherId: other?._id ? String(other._id) : null,
    name: fallbackName,
    email: email,
    avatar: null, // can be hydrated lazily from /profiles/:id/public
    snippet,
    timeISO,
    unread: typeof c.unreadCount === "number" ? c.unreadCount : undefined,
  };
}

/** === Format time label === */
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

/** === Optional: lazy profile fetch for nicer name/avatar === */
async function hydrateProfile(thread: Thread): Promise<Thread> {
  if (!thread.otherId) return thread;
  try {
    // Public profile endpoint from your broader API (auth not required, but ok to send)
    const res = await fetchWithAuth(`${API_BASE}/profiles/${encodeURIComponent(thread.otherId)}/public`);
    if (!res.ok) return thread;
    const data = await res.json();
    const profile = data?.profile || data; // handle either shape
    const displayName =
      profile?.displayName || profile?.username || thread.name;
    const avatar = profile?.avatar || profile?.photo || thread.avatar || null;
    return { ...thread, name: displayName, avatar };
  } catch {
    return thread;
  }
}

/** === Screen === */
export default function Messages() {
  const router = useRouter();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageRef = useRef<number>(1);
  const nextPageRef = useRef<number | null>(1);
  const loadingMoreRef = useRef(false);
  const meIdRef = useRef<string | null>(null);

  const loadPage = useCallback(
    async (page: number, limit = 20) => {
      const res = await fetchWithAuth(
        `${API_BASE}/conversations?page=${page}&limit=${limit}`,
        { method: "GET" }
      );
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Failed to load conversations");
      }
      const data = (await res.json()) as { conversations?: ApiConversation[] };
      const arr = data?.conversations || [];
      // Map to UI
      const mapped = arr.map((c) => mapConversationToThread(c, meIdRef.current));
      // Hydrate profiles in the background (best-effort)
      Promise.all(mapped.map(hydrateProfile))
        .then((hydrated) => {
          // Merge hydrated fields without losing current list order
          setThreads((prev) => {
            const idx: Record<string, number> = {};
            prev.forEach((t, i) => (idx[t.id] = i));
            const merged = [...prev];
            hydrated.forEach((t) => {
              const i = merged.findIndex((x) => x.id === t.id);
              if (i >= 0) merged[i] = { ...merged[i], ...t };
            });
            return merged;
          });
        })
        .catch(() => { /* ignore hydration errors */ });

      const nextPage = arr.length === limit ? page + 1 : null;
      return { items: mapped, nextPage };
    },
    []
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    pageRef.current = 1;
    nextPageRef.current = 1;

    try {
      meIdRef.current = await getMeId();
      const { items, nextPage } = await loadPage(1);
      setThreads(items);
      nextPageRef.current = nextPage;
    } catch (e: any) {
      setError(e?.message || "Failed to load conversations.");
      setThreads([]);
      nextPageRef.current = null;
    } finally {
      setLoading(false);
    }
  }, [loadPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { items, nextPage } = await loadPage(1);
      setThreads(items);
      pageRef.current = 1;
      nextPageRef.current = nextPage;
    } finally {
      setRefreshing(false);
    }
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    if (!nextPageRef.current) return;
    loadingMoreRef.current = true;
    try {
      const p = nextPageRef.current;
      const { items, nextPage } = await loadPage(p!);
      setThreads((prev) => [...prev, ...items]);
      pageRef.current = p!;
      nextPageRef.current = nextPage;
    } finally {
      loadingMoreRef.current = false;
    }
  }, [loadPage]);

  useFocusEffect(
    useCallback(() => {
      loadInitial();
    }, [loadInitial])
  );

  const renderAvatar = (t: Thread) =>
    t.avatar ? (
      <Image source={{ uri: t.avatar }} style={styles.avatar} />
    ) : (
      <Initials text={t.name || t.email || "?"} />
    );

  const openThread = (t: Thread) =>
    router.push(
      `/main/messages/${encodeURIComponent(t.id)}?name=${encodeURIComponent(
        t.name || t.email || "Conversation"
      )}`
    );

  const renderItem = ({ item }: { item: Thread }) => (
    <TouchableOpacity style={styles.thread} onPress={() => openThread(item)}>
      {renderAvatar(item)}

      <View style={styles.threadText}>
        <View style={styles.threadHeader}>
          <Text style={styles.threadName} numberOfLines={1}>
            {item.name || item.email || "Conversation"}
          </Text>
          {typeof item.unread === "number" && item.unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unread}</Text>
            </View>
          )}
        </View>
        {!!item.snippet && (
          <Text style={styles.threadSnippet} numberOfLines={1}>
            {item.snippet}
          </Text>
        )}
      </View>

      <Text style={styles.threadTime}>{timeLabel(item.timeISO)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Feather name="menu" size={24} color="#333" />
        <Text style={styles.headerTitle}>Messages</Text>
        <Feather
          name="search"
          size={24}
          color="#333"
          onPress={() => router.push("/main/search")}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadInitial}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : threads.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            Start a new chat from a profile or matches screen.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReachedThreshold={0.3}
          onEndReached={loadMore}
          ListFooterComponent={
            nextPageRef.current ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

/** === Avatar fallback (initials) === */
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
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarFallbackText}>{initials || "?"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 20, fontWeight: "600", color: "#000" },

  list: { paddingVertical: 6 },

  thread: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 15,
    backgroundColor: "#ddd",
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 15,
    backgroundColor: "#E9D5FF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarFallbackText: { color: "#6B21A8", fontWeight: "700" },

  threadText: { flex: 1 },

  threadHeader: { flexDirection: "row", alignItems: "center" },

  threadName: { fontSize: 16, fontWeight: "600", color: "#000", maxWidth: "80%" },

  badge: {
    marginLeft: 8,
    backgroundColor: "#9333EA",
    borderRadius: 10,
    paddingHorizontal: 6,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  threadSnippet: { marginTop: 3, color: "#666", fontSize: 14 },

  threadTime: { marginLeft: 10, color: "#999", fontSize: 12 },

  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorText: { color: "#B91C1C", textAlign: "center", marginBottom: 12 },
  retryBtn: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "600" },

  footerLoading: { paddingVertical: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 4 },
  emptySubtitle: { color: "#6B7280", textAlign: "center", marginBottom: 12 },
});
