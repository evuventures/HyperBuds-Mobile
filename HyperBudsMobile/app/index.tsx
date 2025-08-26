// app/index.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

type SessionDump = {
  isLoggedIn?: string | null;
  user?: any | null;
};

const log = (...a: any[]) => console.log('[GATE]', ...a);

export default function Gate() {
  const router = useRouter();
  const booted = useRef(false);
  const didRedirect = useRef(false);

  // Start in SAFE MODE (no auto-redirect) so you can observe behavior
  const [autoRedirect, setAutoRedirect] = useState(false);

  const [dump, setDump] = useState<SessionDump | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const pairs = await AsyncStorage.multiGet(['isLoggedIn', 'user']);
      const map = Object.fromEntries(pairs);
      const session: SessionDump = {
        isLoggedIn: map.isLoggedIn ?? null,
        user: (() => {
          try { return map.user ? JSON.parse(map.user) : null; } catch { return map.user; }
        })(),
      };
      setDump(session);
      log('Storage snapshot:', session);
      return session;
    } catch (e) {
      log('Read error:', e);
      setDump(null);
      return null;
    }
  };

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    (async () => {
      const session = await load();
      setLoading(false);

      // Only redirect if autoRedirect is ON and we haven't redirected yet.
      if (autoRedirect && !didRedirect.current) {
        const logged = session?.isLoggedIn === 'true';
        log('Auto-redirect:', logged ? '/main/explore' : '/login&signup/login');
        didRedirect.current = true;
        router.replace(logged ? '/main/explore' : '/login&signup/login');
      } else {
        log('SAFE MODE: auto-redirect disabled');
      }
    })();
  }, [autoRedirect, router]);

  // UI helpers
  const prettyUser =
    dump?.user && typeof dump.user === 'object'
      ? (dump.user.username || dump.user.name || dump.user.email || '(no name)')
      : '(none)';

  const setLogged = async (val: boolean) => {
    await AsyncStorage.setItem('isLoggedIn', val ? 'true' : 'false');
    await load();
  };

  const clearSession = async () => {
    await AsyncStorage.multiRemove(['user', 'isLoggedIn', 'rememberedEmail']);
    await load();
  };

  const writeFakeUser = async () => {
    await AsyncStorage.setItem('user', JSON.stringify({ email: 'test@test.com', username: 'tester' }));
    await AsyncStorage.setItem('isLoggedIn', 'true');
    await load();
  };

  return (
    <View style={styles.wrap}>
      <ActivityIndicator />
      <Text style={styles.h1}>App Gate (debug)</Text>

      <View style={styles.row}><Text style={styles.k}>isLoggedIn:</Text><Text style={styles.v}>{String(dump?.isLoggedIn)}</Text></View>
      <View style={styles.row}><Text style={styles.k}>user:</Text><Text style={styles.v}>{prettyUser}</Text></View>
      <View style={styles.row}><Text style={styles.k}>autoRedirect:</Text><Text style={styles.v}>{String(autoRedirect)}</Text></View>

      <View style={styles.btnRow}>
        <Btn label="Reload Keys" onPress={load} />
        <Btn label="Go Explore" onPress={() => router.replace('/main/explore')} />
        <Btn label="Go Login" onPress={() => router.replace('/login&signup/login')} />
      </View>

      <View style={styles.btnRow}>
        <Btn label="Set LoggedIn=true" onPress={() => setLogged(true)} />
        <Btn label="Set LoggedIn=false" onPress={() => setLogged(false)} />
      </View>

      <View style={styles.btnRow}>
        <Btn label="Write Fake User" onPress={writeFakeUser} />
        <Btn label="Clear Session Keys" onPress={clearSession} />
      </View>

      <View style={styles.btnRowWide}>
        <Btn
          label={autoRedirect ? 'Disable Auto-Redirect' : 'Enable Auto-Redirect'}
          onPress={() => {
            didRedirect.current = false;
            setAutoRedirect(v => !v);
          }}
        />
      </View>

      {loading && <Text style={styles.note}>Loading…</Text>}
      {!autoRedirect && (
        <Text style={styles.note}>
          Safe mode is ON — no automatic navigation. Use the buttons above.
        </Text>
      )}
    </View>
  );
}

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 10 },
  h1: { marginTop: 8, fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8 },
  k: { color: '#666' },
  v: { color: '#000', fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  btnRowWide: { width: '100%', marginTop: 8 },
  btn: { backgroundColor: '#9333EA', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
  note: { marginTop: 6, color: '#666', fontSize: 12, textAlign: 'center' },
});
