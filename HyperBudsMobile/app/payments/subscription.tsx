// app/payments/subscriptions.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  TextInput, // ← added
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { CardField, useStripe, initStripe } from "@stripe/stripe-react-native";

/* =========================
   CONFIG & BASE URLS
   ========================= */
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || "").trim() ||
  "https://api-hyperbuds-backend.onrender.com/api/v1";

const PAY_API_BASE = `${API_BASE}/payments`;

const STRIPE_PUBLISHABLE_KEY =
  (process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "").trim();

/* =========================
   Plans
   ========================= */
const PLANS = [
  {
    key: "basic" as const,
    title: "Basic",
    priceCents: 900,
    priceLabel: "$9/mo",
    priceId:
      (process.env.EXPO_PUBLIC_PRICE_BASIC_ID || "").trim() ||
      "price_basic_monthly",
    features: ["Core features", "Community access", "Email support"],
  },
  {
    key: "premium" as const,
    title: "Premium",
    priceCents: 2900,
    priceLabel: "$29/mo",
    priceId:
      (process.env.EXPO_PUBLIC_PRICE_PREMIUM_ID || "").trim() ||
      "price_premium_monthly",
    features: ["Everything in Basic", "Advanced analytics", "Priority support"],
    featured: true,
  },
  {
    key: "enterprise" as const,
    title: "Enterprise",
    priceCents: 9900,
    priceLabel: "$99/mo",
    priceId:
      (process.env.EXPO_PUBLIC_PRICE_ENTERPRISE_ID || "").trim() ||
      "price_enterprise_monthly",
    features: ["Everything in Premium", "SLA & SSO", "Dedicated success manager"],
  },
];

type TierKey = typeof PLANS[number]["key"];

/* =========================
   Types
   ========================= */
type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault?: boolean;
};

type MethodsResp = {
  success: boolean;
  data?: { paymentMethods?: PaymentMethod[] };
  message?: string;
  code?: string;
};

type SubCreateResp = {
  success: boolean;
  data?: {
    subscriptionId: string;
    status: string;
    subscription?: {
      subscriptionId?: string;
      status?: string;
      tier: string;
      currentPeriodEnd?: string;
    };
  };
  message?: string;
  code?: string;
};

type SubUpdateResp = {
  success: boolean;
  data?: {
    subscriptionId: string;
    status: string;
    message?: string;
  };
  message?: string;
  code?: string;
};

type SubscriptionState = {
  subscriptionId?: string;
  status?: string;
  tier?: string;
  currentPeriodEnd?: string;
};

/* =========================
   Authed fetch helper
   ========================= */
async function getAccessToken(): Promise<string | null> {
  return (await AsyncStorage.getItem("auth.accessToken")) || null;
}

async function authedFetch(base: string, path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error("Sign in required - missing token");

  const headers = new Headers(init.headers as HeadersInit);
  headers.set("Accept", "application/json");
  if (
    !(typeof FormData !== "undefined" && init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${token}`);

  const url = `${base}${path}`;

  try {
    const res = await fetch(url, { ...init, headers });
    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {}

    if (!res.ok || data?.success === false) {
      const msg = data?.message || `Request failed (${res.status})`;
      const code = data?.code ? ` [${data.code}]` : "";
      const pretty = `${msg}${code}`;
      console.log("HTTP error:", { url, status: res.status, body: text });
      throw new Error(pretty);
    }
    return data;
  } catch (err: any) {
    console.log("authedFetch network error ->", {
      url,
      message: String(err?.message || err),
      stack: err?.stack,
      platform: Platform.OS,
    });
    throw err;
  }
}

/* =========================
   Screen
   ========================= */
export default function SubscriptionsScreen() {
  const router = useRouter();
  const { createPaymentMethod } = useStripe();

  const [stripeReady, setStripeReady] = useState<boolean>(false);

  const [selectedPlan, setSelectedPlan] = useState<TierKey>("premium");

  // Saved payment methods
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);

  // New card flow
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [newPMId, setNewPMId] = useState<string | null>(null);

  // Manual (non-functional) card inputs
  const [showManualCard, setShowManualCard] = useState(true); // default visible per request
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardZip, setCardZip] = useState("");

  // UX
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subState, setSubState] = useState<SubscriptionState | null>(null);

  // Diagnostics
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const addDebug = (line: string) =>
    setDebugLines((prev) => [`• ${new Date().toLocaleTimeString()} ${line}`, ...prev].slice(0, 50));

  // Init Stripe
  useEffect(() => {
    (async () => {
      if (!STRIPE_PUBLISHABLE_KEY) {
        addDebug("Missing EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY");
        return;
      }
      try {
        await initStripe({
          publishableKey: STRIPE_PUBLISHABLE_KEY,
          merchantIdentifier: "merchant.com.hyperbuds",
        });
        setStripeReady(true);
        addDebug("Stripe initialized");
      } catch (e: any) {
        addDebug(`Stripe init error: ${String(e?.message || e)}`);
      }
    })();
  }, []);

  async function loadMethods() {
    setError(null);
    try {
      const resp = (await authedFetch(PAY_API_BASE, "/methods", {
        method: "GET",
      })) as MethodsResp;
      const list = resp?.data?.paymentMethods || [];
      setMethods(list);
      const def = list.find((m) => m.isDefault) || list[0];
      setSelectedMethodId(def ? def.id : null);
      addDebug(`Loaded ${list.length} saved method(s)`);
    } catch (e: any) {
      setError(e?.message || "Failed to load payment methods");
      addDebug(`Load methods error: ${String(e?.message || e)}`);
    }
  }

  useEffect(() => {
    loadMethods();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMethods();
    setRefreshing(false);
  };

  const currentPlan = useMemo(
    () => PLANS.find((p) => p.key === selectedPlan)!,
    [selectedPlan]
  );

  /* ===== Add Card (Stripe) ===== */
  const handleCreatePaymentMethod = async () => {
    try {
      if (!stripeReady) {
        Alert.alert("Stripe not ready", "Please try again in a moment.");
        return;
      }
      if (!cardComplete) {
        Alert.alert("Incomplete", "Please fill in card details.");
        return;
      }
      setLoading(true);

      const res = await useStripe().createPaymentMethod({
        paymentMethodType: "Card",
      });

      if (res.error) throw new Error(res.error.message || "Could not create payment method");

      const pmId = res.paymentMethod?.id;
      if (!pmId) throw new Error("No payment method returned");

      setNewPMId(pmId);
      setSelectedMethodId(null);
      Alert.alert("Card ready", "New card saved for this checkout.");
      addDebug(`Created payment method: ${pmId}`);
    } catch (e: any) {
      setError(e?.message || "Could not create payment method");
      addDebug(`Create PM error: ${String(e?.message || e)}`);
    } finally {
      setLoading(false);
    }
  };

  /* ===== Remove saved method ===== */
  const handleRemoveMethod = async (id: string) => {
    try {
      setLoading(true);
      await authedFetch(PAY_API_BASE, `/methods/${id}`, { method: "DELETE" });
      if (selectedMethodId === id) setSelectedMethodId(null);
      await loadMethods();
      addDebug(`Removed method ${id}`);
    } catch (e: any) {
      setError(e?.message || "Failed to remove method");
      addDebug(`Remove method error: ${String(e?.message || e)}`);
    } finally {
      setLoading(false);
    }
  };

  /* ===== Subscribe / Update ===== */
  const handleSubscribeOrUpdate = async () => {
    try {
      setLoading(true);
      setError(null);

      const paymentMethodId = newPMId || selectedMethodId || undefined;
      if (!paymentMethodId && !subState?.status) {
        Alert.alert("Payment Method", "Select a saved card or add a new one.");
        setLoading(false);
        return;
      }

      if (subState?.status) {
        // Update plan
        const resp = (await authedFetch(PAY_API_BASE, "/subscriptions", {
          method: "PUT",
          body: JSON.stringify({
            priceId: currentPlan.priceId,
            tier: currentPlan.key,
          }),
        })) as SubUpdateResp;

        setSubState({
          subscriptionId: resp?.data?.subscriptionId,
          status: resp?.data?.status,
          tier: currentPlan.key,
        });
        Alert.alert("Updated", "Your subscription was updated.");
        addDebug(`Updated subscription -> ${currentPlan.key}`);
      } else {
        // Create new subscription
        const resp = (await authedFetch(PAY_API_BASE, "/subscriptions", {
          method: "POST",
          body: JSON.stringify({
            priceId: currentPlan.priceId,
            tier: currentPlan.key,
            paymentMethodId,
          }),
        })) as SubCreateResp;

        const s =
          resp?.data?.subscription ||
          (resp?.data
            ? {
                subscriptionId: resp.data.subscriptionId,
                status: resp.data.status,
                tier: currentPlan.key,
              }
            : null);
        if (s) setSubState(s);
        Alert.alert("Subscribed", "Your subscription is active.");
        addDebug(`Subscribed to ${currentPlan.key}`);
      }
    } catch (e: any) {
      setError(e?.message || "Checkout failed");
      addDebug(`Subscribe/Update error: ${String(e?.message || e)}`);
      if (Platform.OS === "web" && /Failed to fetch|NetworkError/.test(String(e))) {
        addDebug("Possible CORS issue (browser). Enable CORS for your dev origin or proxy through the app host.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAtPeriodEnd = async () => {
    try {
      setLoading(true);
      setError(null);
      await authedFetch(PAY_API_BASE, "/subscriptions", {
        method: "DELETE",
        body: JSON.stringify({ cancelAtPeriodEnd: true }),
      });
      setSubState((prev) => ({ ...(prev || {}), status: "canceled_at_period_end" }));
      Alert.alert("Scheduled", "Subscription will cancel at period end.");
      addDebug("Cancellation scheduled at period end.");
    } catch (e: any) {
      setError(e?.message || "Cancel failed");
      addDebug(`Cancel error: ${String(e?.message || e)}`);
    } finally {
      setLoading(false);
    }
  };

  /* ===== Diagnostics: Connectivity checks ===== */
  const runConnectivityChecks = async () => {
    try {
      addDebug(`API_BASE = ${API_BASE}`);
      addDebug(`PAY_API_BASE = ${PAY_API_BASE}`);

      const token = await getAccessToken();
      addDebug(token ? "Access token: present" : "Access token: MISSING");
      if (!token) {
        Alert.alert("Auth", "Please sign in again. No access token found.");
        return;
      }

      setLoading(true);
      await authedFetch(PAY_API_BASE, "/methods", { method: "GET" });
      addDebug("GET /methods ✅ OK");
      Alert.alert("Network OK", `Reached ${PAY_API_BASE}`);
    } catch (e: any) {
      const msg = String(e?.message || e);
      addDebug(`Connectivity error: ${msg}`);
      if (Platform.OS === "web" && /Failed to fetch|NetworkError/i.test(msg)) {
        addDebug("Hint: Likely CORS. Allow your dev origin in the API or proxy requests.");
      }
      Alert.alert("Network error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <LinearGradient
        colors={["#8B5CF6", "#3B82F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscriptions</Text>
          <TouchableOpacity onPress={() => setDebugOpen((v) => !v)} style={styles.iconBtn}>
            <Feather name={debugOpen ? "terminal" : "info"} size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Error Banner */}
      {error ? (
        <View style={styles.errorWrap}>
          <Feather name="alert-triangle" size={16} color="#B00020" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Diagnostics Panel */}
      {debugOpen ? (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>Diagnostics</Text>
          <Text style={styles.debugLine}>Platform: {Platform.OS}</Text>
          <Text style={styles.debugLine}>API_BASE: {API_BASE}</Text>
          <Text style={styles.debugLine}>PAY_API_BASE: {PAY_API_BASE}</Text>
          <View style={{ height: 8 }} />
          <TouchableOpacity onPress={runConnectivityChecks} disabled={loading}>
            <LinearGradient
              colors={["#8B5CF6", "#3B82F6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            >
              <Text style={styles.primaryBtnText}>Run Connectivity Checks</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.debugLogWrap}>
            {debugLines.length ? (
              debugLines.map((l, i) => (
                <Text key={i} style={styles.debugLogLine} numberOfLines={2}>
                  {l}
                </Text>
              ))
            ) : (
              <Text style={styles.helpTextSmall}>No logs yet.</Text>
            )}
          </View>
          <Text style={styles.helpTextSmall}>
            Tip: If this fails only on Web, it’s likely CORS. Allow your dev origin (e.g., http://localhost:19006) on the API or proxy through your app host.
          </Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Plans — now ONE per row */}
        <Section title="Choose a Plan" icon="star">
          <View style={styles.planList}>
            {PLANS.map((plan) => (
              <TouchableOpacity
                key={plan.key}
                activeOpacity={0.9}
                onPress={() => setSelectedPlan(plan.key)}
                style={[
                  styles.planRowCard,
                  selectedPlan === plan.key && styles.planRowCardSelected,
                  plan.featured && styles.planRowCardFeatured,
                ]}
              >
                <View style={styles.planRowHeader}>
                  <Text style={styles.planRowTitle}>{plan.title}</Text>
                  {selectedPlan === plan.key ? (
                    <Feather name="check-circle" size={18} color="#8B5CF6" />
                  ) : (
                    <Feather name="circle" size={18} color="#bbb" />
                  )}
                </View>
                <Text style={styles.planRowPrice}>{plan.priceLabel}</Text>
                <View style={{ height: 6 }} />
                {plan.features.map((f, i) => (
                  <View key={i} style={styles.planFeatRow}>
                    <Feather name="check" size={14} color="#16a34a" />
                    <Text style={styles.planFeatText}>{f}</Text>
                  </View>
                ))}
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Payment Methods */}
        <Section title="Payment Method" icon="credit-card">
          {/* Saved cards */}
          {methods.length ? (
            <View style={{ marginBottom: 8 }}>
              {methods.map((m) => {
                const isSelected = selectedMethodId === m.id && !newPMId;
                return (
                  <View key={m.id} style={[styles.pmRow, isSelected && styles.pmRowSelected]}>
                    <TouchableOpacity
                      style={styles.pmRadioRow}
                      onPress={() => {
                        setSelectedMethodId(m.id);
                        setNewPMId(null);
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={isSelected ? "radio-button-on" : "radio-button-off"}
                        size={18}
                        color={isSelected ? "#8B5CF6" : "#888"}
                        style={{ marginRight: 8 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pmTitle}>
                          {m.brand?.toUpperCase()} •••• {m.last4}
                          {m.isDefault ? <Text style={styles.defaultPill}>  DEFAULT</Text> : null}
                        </Text>
                        <Text style={styles.pmSub}>Expires {m.expMonth}/{m.expYear}</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(
                          "Remove card?",
                          `${m.brand?.toUpperCase()} •••• ${m.last4}`,
                          [
                            { text: "Cancel", style: "cancel" },
                            { text: "Remove", style: "destructive", onPress: () => handleRemoveMethod(m.id) },
                          ]
                        )
                      }
                      style={styles.pmRemoveBtn}
                    >
                      <Feather name="trash-2" size={16} color="#B00020" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.helpText}>No saved cards. Add a new card below.</Text>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Add new card (Stripe) */}
          <TouchableOpacity
            onPress={() => setShowAddCard((v) => !v)}
            style={styles.addCardHeader}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather name="plus-circle" size={18} color="#8B5CF6" />
              <Text style={styles.addCardTitle}>  Add New Card (Stripe)</Text>
            </View>
            <Feather name={showAddCard ? "chevron-up" : "chevron-down"} size={18} color="#8B5CF6" />
          </TouchableOpacity>

          {showAddCard ? (
            <View style={styles.addCardBody}>
              {stripeReady ? (
                <>
                  <CardField
                    postalCodeEnabled
                    placeholders={{ number: "4242 4242 4242 4242" }}
                    onCardChange={(d) => setCardComplete(Boolean(d?.complete))}
                    style={styles.cardField}
                  />
                  <TouchableOpacity
                    onPress={handleCreatePaymentMethod}
                    disabled={!cardComplete || loading}
                    style={{ opacity: cardComplete && !loading ? 1 : 0.6 }}
                  >
                    <LinearGradient
                      colors={["#8B5CF6", "#3B82F6"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.primaryBtn}
                    >
                      <Text style={styles.primaryBtnText}>
                        {newPMId ? "Card Ready" : "Use This Card"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  {newPMId ? (
                    <Text style={styles.helpTextSmall}>Using new card (PM: {newPMId})</Text>
                  ) : null}
                </>
              ) : (
                <View style={styles.stripeWarn}>
                  <Feather name="alert-circle" size={16} color="#8a6d3b" />
                  <Text style={styles.stripeWarnText}>
                    Stripe isn’t initialized. Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY and restart.
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {/* Manual (non-functional) card form */}
          <View style={[styles.addCardBody, { marginTop: 10 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.addCardTitle}>Manual Card</Text>
              <TouchableOpacity onPress={() => setShowManualCard(v => !v)}>
                <Feather name={showManualCard ? "chevron-up" : "chevron-down"} size={18} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
            {showManualCard ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Name on card"
                  placeholderTextColor="#666"
                  value={cardName}
                  onChangeText={setCardName}
                  autoCapitalize="words"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Card number"
                  placeholderTextColor="#666"
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  keyboardType="number-pad"
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="MM/YY"
                    placeholderTextColor="#666"
                    value={cardExpiry}
                    onChangeText={setCardExpiry}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="CVC"
                    placeholderTextColor="#666"
                    value={cardCvc}
                    onChangeText={setCardCvc}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="ZIP / Postal code"
                  placeholderTextColor="#666"
                  value={cardZip}
                  onChangeText={setCardZip}
                  keyboardType="number-pad"
                />
                <Text style={styles.helpTextSmall}>
                  This form is only for UI input per your request and doesn’t submit anywhere.
                </Text>
              </>
            ) : null}
          </View>

          <Text style={styles.pciNote}>
            We never see or store raw card details. Card data is securely collected by Stripe when enabled.
          </Text>
        </Section>

        {/* Confirm */}
        <Section title="Confirm" icon="check-circle">
          <TouchableOpacity onPress={handleSubscribeOrUpdate} disabled={loading}>
            <LinearGradient
              colors={["#8B5CF6", "#3B82F6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            >
              <Text style={styles.primaryBtnText}>
                {subState?.status ? "Update Plan" : "Subscribe"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {subState?.status ? (
            <>
              <View style={{ height: 8 }} />
              <TouchableOpacity
                onPress={handleCancelAtPeriodEnd}
                disabled={loading}
                style={[styles.outlineBtn, loading && { opacity: 0.7 }]}
              >
                <Text style={styles.outlineBtnText}>Cancel at Period End</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </Section>

        {/* Current Subscription */}
        {subState?.status ? (
          <Section title="Current Subscription" icon="info">
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Status: {subState.status}</Text>
              <Text style={styles.cardSub}>
                Tier: {subState.tier || selectedPlan}
                {subState.currentPeriodEnd
                  ? `\nRenews: ${new Date(subState.currentPeriodEnd).toLocaleDateString()}`
                  : ""}
              </Text>
            </View>
          </Section>
        ) : null}

        {loading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================
   UI Bits
   ========================= */
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Feather name={icon} size={18} color="#333" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

/* =========================
   Styles
   ========================= */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7fb" },

  header: {
    paddingTop: Platform.select({ ios: 8, android: 12 }),
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },

  errorWrap: {
    backgroundColor: "#FFEAEA",
    borderColor: "#FFB3B3",
    borderWidth: 1,
    margin: 12,
    padding: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: { color: "#B00020", fontSize: 12, flexShrink: 1 },

  /* Diagnostics */
  debugPanel: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 10,
  },
  debugTitle: { fontSize: 14, fontWeight: "800", color: "#333" },
  debugLine: { fontSize: 12, color: "#444", marginTop: 2 },
  debugLogWrap: {
    marginTop: 10,
    backgroundColor: "#0B1020",
    borderRadius: 8,
    padding: 8,
    maxHeight: 180,
  },
  debugLogLine: { fontSize: 11, color: "#E6EAF2", marginBottom: 4 },

  content: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },

  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#333" },

  /* Plans — one per row */
  planList: { gap: 10 },
  planRowCard: {
    width: "100%",
    backgroundColor: "#fafafa",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
  },
  planRowCardSelected: { borderColor: "#8B5CF6", backgroundColor: "#f5f7ff" },
  planRowCardFeatured: { borderColor: "#dbe7ff", backgroundColor: "#f9f9ff" },
  planRowHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planRowTitle: { fontSize: 16, fontWeight: "800", color: "#222" },
  planRowPrice: { fontSize: 22, fontWeight: "800", color: "#3B82F6", marginTop: 4 },
  planFeatRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  planFeatText: { fontSize: 12, color: "#444" },

  /* Payment Methods */
  pmRow: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  pmRowSelected: { borderColor: "#8B5CF6", backgroundColor: "#f5f7ff" },
  pmRadioRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  pmTitle: { fontSize: 14, color: "#333", fontWeight: "700" },
  pmSub: { fontSize: 12, color: "#666", marginTop: 2 },
  pmRemoveBtn: {
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#fff0f0",
    borderWidth: 1,
    borderColor: "#ffd6d6",
  },
  defaultPill: {
    fontSize: 10,
    color: "#3B82F6",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  divider: { height: 1, backgroundColor: "#eee", marginVertical: 10 },
  addCardHeader: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addCardTitle: { fontSize: 14, fontWeight: "800", color: "#333" },
  addCardBody: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 10,
    marginTop: 6,
  },
  cardField: { width: "100%", height: 50, marginVertical: 8 },
  stripeWarn: {
    backgroundColor: "#fff8e6",
    borderColor: "#ffe6b3",
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  stripeWarnText: { color: "#8a6d3b", fontSize: 12, flexShrink: 1 },

  // Manual input form
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
    marginBottom: 10,
    color: "#000",
  },

  pciNote: { fontSize: 11, color: "#666", marginTop: 8 },

  /* Buttons */
  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  outlineBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#8B5CF6",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
  },
  outlineBtnText: { color: "#8B5CF6", fontWeight: "700", fontSize: 14 },

  card: {
    backgroundColor: "#fafafa",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#333" },
  cardSub: { fontSize: 12, color: "#666", marginTop: 2 },

  helpText: { fontSize: 12, color: "#666", marginTop: 6 },
  helpTextSmall: { fontSize: 11, color: "#666", marginTop: 6 },
});
