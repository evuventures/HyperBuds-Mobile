// app/payments/payment.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather, AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

/** =========================
 *  API BASES
 *  ========================= */
const PAY_API_BASE =
  (process.env.EXPO_PUBLIC_PAYMENTS_BASE_URL || "").trim() ||
  "https://api.hyperbuds.com/api/v1/payments";

/** Try multiple common keys to find the JWT the rest of your app stores */
async function getAuthToken(): Promise<string | null> {
  const keys = ["hb_token", "token", "authToken", "jwt", "accessToken"];
  for (const k of keys) {
    const v = await AsyncStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

async function authedFetch(path: string, init: RequestInit = {}) {
  const token = await getAuthToken();
  if (!token) throw new Error("Sign in required - missing token");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(init.headers || {}),
  };
  const res = await fetch(`${PAY_API_BASE}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    const msg =
      data?.message ||
      `Request failed (${res.status}) on ${path.replace(/^\//, "")}`;
    const code = data?.code ? ` [${data.code}]` : "";
    throw new Error(`${msg}${code}`);
  }
  return data;
}

/** =========================
 *  Types
 *  ========================= */
type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault?: boolean;
};

type Payment = {
  _id: string;
  amount: number; // cents
  currency: string; // "usd"
  status: string;
  paymentType?: string;
  createdAt: string;
};

type HistoryResp = {
  payments: Payment[];
  pagination: { total: number; pages: number; currentPage: number; limit: number };
};

type Payout = {
  _id: string;
  amount: number; // dollars (per example) or cents? (spec mixes) — we'll render safely
  currency: string;
  status: string;
  type: string;
  createdAt: string;
  estimatedArrival?: string;
};

type PayoutHistoryResp = {
  payouts: Payout[];
  pagination: { total: number; pages: number; currentPage: number; limit: number };
};

type Earnings = {
  totalEarnings: number;
  availableForPayout: number;
  pendingPayouts: number;
  completedPayouts: number;
  thisMonthEarnings: number;
};

type SubscriptionState = {
  subscriptionId?: string;
  status?: string;
  tier?: string;
  currentPeriodEnd?: string;
};

/** =========================
 *  Helpers
 *  ========================= */
const centsToUSD = (cents?: number) =>
  typeof cents === "number" ? `$${(cents / 100).toFixed(2)}` : "-";

const formatUSDLoose = (n: number) =>
  // Some payout examples show whole-dollar floats; show nicely either way.
  `$${Number(n).toLocaleString(undefined, {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

const dateShort = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString() + " " + new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";

/** =========================
 *  Component
 *  ========================= */
export default function PaymentScreen() {
  const router = useRouter();

  // Tabs
  const [tab, setTab] = useState<"summary" | "methods" | "subscription" | "history" | "payouts">(
    "summary"
  );

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [history, setHistory] = useState<Payment[] | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);

  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [payoutsPages, setPayoutsPages] = useState(1);

  const [subState, setSubState] = useState<SubscriptionState | null>(null);

  // Forms / Inputs
  const [newPMId, setNewPMId] = useState(""); // when confirming intents / creating subs (placeholder for Stripe PM id)
  const [intentAmount, setIntentAmount] = useState("1999"); // cents
  const [intentType, setIntentType] = useState<"subscription" | "marketplace_service">("subscription");
  const [intentDesc, setIntentDesc] = useState("Premium subscription");
  const intentRef = useRef<{ paymentIntentId?: string; clientSecret?: string; paymentId?: string }>(
    {}
  );

  // Subscription inputs
  const [subTier, setSubTier] = useState<"premium" | "pro">("premium");
  const [subPriceId, setSubPriceId] = useState("price_premium_monthly");

  // Payout / Connect inputs
  const [payoutAmount, setPayoutAmount] = useState("5000"); // cents per docs for /payouts (example uses $10000 cents)
  const [payoutType, setPayoutType] = useState("marketplace_earnings");

  const [connectEmail, setConnectEmail] = useState("");
  const [connectCountry, setConnectCountry] = useState("US");
  const [connectFName, setConnectFName] = useState("");
  const [connectLName, setConnectLName] = useState("");
  const [connectCity, setConnectCity] = useState("");
  const [connectState, setConnectState] = useState("");
  const [connectPostal, setConnectPostal] = useState("");
  const [connectLine1, setConnectLine1] = useState("");

  /** Initial load (earnings + methods + subscription-ish via earnings ping) */
  useEffect(() => {
    loadSummary().catch(() => {});
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      if (tab === "summary") {
        await loadSummary();
      } else if (tab === "methods") {
        await loadMethods();
      } else if (tab === "history") {
        await loadHistory(1);
      } else if (tab === "payouts") {
        await loadPayouts(1);
      }
    } catch (e: any) {
      setError(e?.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  /** Loaders */
  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const e = await authedFetch("/earnings", { method: "GET" });
      setEarnings(e?.data as Earnings);
      // prime methods too
      const m = await authedFetch("/methods", { method: "GET" });
      setMethods((m?.data?.paymentMethods || []) as PaymentMethod[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load summary");
    } finally {
      setLoading(false);
    }
  };

  const loadMethods = async () => {
    setLoading(true);
    setError(null);
    try {
      const m = await authedFetch("/methods", { method: "GET" });
      setMethods((m?.data?.paymentMethods || []) as PaymentMethod[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load methods");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const h = await authedFetch(
        `/history?page=${page}&limit=20&status=succeeded&paymentType=subscription`,
        { method: "GET" }
      );
      const payload = (h?.data || {}) as HistoryResp;
      setHistory(payload.payments || []);
      setHistoryPage(payload.pagination?.currentPage || page);
      setHistoryPages(payload.pagination?.pages || 1);
    } catch (e: any) {
      setError(e?.message || "Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  const loadPayouts = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const p = await authedFetch(`/payouts/history?page=${page}&limit=20&status=paid`, {
        method: "GET",
      });
      const payload = (p?.data || {}) as PayoutHistoryResp;
      setPayouts(payload.payouts || []);
      setPayoutsPage(payload.pagination?.currentPage || page);
      setPayoutsPages(payload.pagination?.pages || 1);
    } catch (e: any) {
      setError(e?.message || "Failed to load payout history");
    } finally {
      setLoading(false);
    }
  };

  /** Actions: Payment Intents */
  const createSetupIntent = async () => {
    try {
      setLoading(true);
      setError(null);
      const body = {
        amount: Number(intentAmount || "0"),
        currency: "usd",
        paymentType: intentType,
        metadata: {
          description: intentDesc || (intentType === "subscription" ? "Premium subscription" : ""),
        },
      };
      const resp = await authedFetch("/setup-intent", {
        method: "POST",
        body: JSON.stringify(body),
      });
      intentRef.current = resp?.data || {};
      Alert.alert("Payment Intent Created", `ID: ${intentRef.current.paymentIntentId || "?"}`);
    } catch (e: any) {
      setError(e?.message || "Failed to create payment intent");
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async () => {
    try {
      if (!intentRef.current?.paymentIntentId) {
        Alert.alert("Missing Intent", "Create a payment intent first.");
        return;
      }
      if (!newPMId.trim()) {
        Alert.alert("Missing Payment Method", "Please enter a paymentMethodId to confirm.");
        return;
      }
      setLoading(true);
      setError(null);
      const resp = await authedFetch("/confirm", {
        method: "POST",
        body: JSON.stringify({
          paymentIntentId: intentRef.current.paymentIntentId,
          paymentMethodId: newPMId.trim(),
        }),
      });
      const status = resp?.data?.status || "processed";
      Alert.alert("Payment", `Status: ${status}`);
      // Refresh summaries/history
      await Promise.all([loadSummary(), loadHistory(1)]);
    } catch (e: any) {
      setError(e?.message || "Failed to confirm payment");
    } finally {
      setLoading(false);
    }
  };

  /** Actions: Subscription */
  const createSubscription = async () => {
    try {
      if (!newPMId.trim()) {
        Alert.alert("Missing Payment Method", "Enter a paymentMethodId to create subscription.");
        return;
      }
      setLoading(true);
      setError(null);
      const resp = await authedFetch("/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          priceId: subPriceId,
          tier: subTier,
          paymentMethodId: newPMId.trim(),
        }),
      });
      setSubState(resp?.data?.subscription || resp?.data || {});
      Alert.alert("Subscription", "Subscription created/active.");
      await loadHistory(1);
    } catch (e: any) {
      setError(e?.message || "Failed to create subscription");
    } finally {
      setLoading(false);
    }
  };

  const updateSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await authedFetch("/subscriptions", {
        method: "PUT",
        body: JSON.stringify({
          priceId: subTier === "pro" ? "price_pro_monthly" : "price_premium_monthly",
          tier: subTier,
        }),
      });
      setSubState(resp?.data || {});
      Alert.alert("Subscription", "Subscription updated.");
    } catch (e: any) {
      setError(e?.message || "Failed to update subscription");
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await authedFetch("/subscriptions", {
        method: "DELETE",
        body: JSON.stringify({ cancelAtPeriodEnd: true }),
      });
      setSubState(resp?.data || {});
      Alert.alert("Subscription", "Will cancel at period end.");
    } catch (e: any) {
      setError(e?.message || "Failed to cancel subscription");
    } finally {
      setLoading(false);
    }
  };

  /** Actions: Methods */
  const removeMethod = async (pmId: string) => {
    try {
      setLoading(true);
      setError(null);
      await authedFetch(`/methods/${pmId}`, { method: "DELETE" });
      setMethods((prev) => (prev || []).filter((m) => m.id !== pmId));
    } catch (e: any) {
      setError(e?.message || "Failed to remove payment method");
    } finally {
      setLoading(false);
    }
  };

  /** Actions: Connect / Payouts */
  const setupCreatorPayoutAccount = async () => {
    try {
      if (!connectEmail || !connectFName || !connectLName || !connectLine1 || !connectCity || !connectState || !connectPostal) {
        Alert.alert("Missing Info", "Please fill out all required fields.");
        return;
      }
      setLoading(true);
      setError(null);
      const resp = await authedFetch("/payouts/setup", {
        method: "POST",
        body: JSON.stringify({
          country: connectCountry,
          email: connectEmail,
          businessType: "individual",
          individual: {
            firstName: connectFName,
            lastName: connectLName,
            email: connectEmail,
            address: {
              line1: connectLine1,
              city: connectCity,
              state: connectState,
              postalCode: connectPostal,
              country: connectCountry,
            },
          },
        }),
      });
      const url = resp?.data?.onboardingUrl;
      Alert.alert(
        "Stripe Connect",
        url ? "Open the onboarding link in your browser." : "Setup initiated."
      );
    } catch (e: any) {
      setError(e?.message || "Failed to start payout account setup");
    } finally {
      setLoading(false);
    }
  };

  const checkPayoutStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await authedFetch("/payouts/account-status", { method: "GET" });
      const d = resp?.data || {};
      Alert.alert(
        "Payout Account Status",
        `Details submitted: ${d.detailsSubmitted ? "Yes" : "No"}\nCharges enabled: ${
          d.chargesEnabled ? "Yes" : "No"
        }\nTransfers enabled: ${d.transfersEnabled ? "Yes" : "No"}\nRequires action: ${
          d.requiresAction ? "Yes" : "No"
        }`
      );
    } catch (e: any) {
      setError(e?.message || "Failed to check payout status");
    } finally {
      setLoading(false);
    }
  };

  const requestPayout = async () => {
    try {
      if (!payoutAmount) {
        Alert.alert("Missing amount", "Enter an amount in cents.");
        return;
      }
      setLoading(true);
      setError(null);
      await authedFetch("/payouts", {
        method: "POST",
        body: JSON.stringify({
          amount: Number(payoutAmount),
          payoutType,
          description: "Creator payout",
        }),
      });
      Alert.alert("Payout", "Payout initiated.");
      await loadPayouts(1);
    } catch (e: any) {
      setError(e?.message || "Failed to request payout");
    } finally {
      setLoading(false);
    }
  };

  /** Auto-fetch when switching to certain tabs */
  useEffect(() => {
    if (tab === "methods" && methods === null) loadMethods();
    if (tab === "history" && history === null) loadHistory(1);
    if (tab === "payouts" && payouts === null) loadPayouts(1);
  }, [tab]);

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={["#6C63FF", "#A48CFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payments</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.tabRow}>
          <TabBtn label="Summary" active={tab === "summary"} onPress={() => setTab("summary")} />
          <TabBtn label="Methods" active={tab === "methods"} onPress={() => setTab("methods")} />
          <TabBtn label="Subscription" active={tab === "subscription"} onPress={() => setTab("subscription")} />
          <TabBtn label="History" active={tab === "history"} onPress={() => setTab("history")} />
          <TabBtn label="Payouts" active={tab === "payouts"} onPress={() => setTab("payouts")} />
        </View>
      </LinearGradient>

      {error ? (
        <View style={styles.errorWrap}>
          <Feather name="alert-triangle" size={16} color="#B00020" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tab === "summary" && (
          <>
            <Section title="Earnings Overview" icon="bar-chart-2">
              {loading && !earnings ? (
                <Loader />
              ) : earnings ? (
                <View style={styles.grid2}>
                  <Metric label="Total Earnings" value={formatUSDLoose(earnings.totalEarnings)} />
                  <Metric label="Available" value={formatUSDLoose(earnings.availableForPayout)} />
                  <Metric label="Pending Payouts" value={formatUSDLoose(earnings.pendingPayouts)} />
                  <Metric label="Completed Payouts" value={formatUSDLoose(earnings.completedPayouts)} />
                  <Metric label="This Month" value={formatUSDLoose(earnings.thisMonthEarnings)} />
                </View>
              ) : (
                <Empty text="No earnings yet." />
              )}
            </Section>

            <Section title="Quick Charge (Intent)" icon="credit-card">
              <Text style={styles.helpText}>
                Create & confirm a one-off payment intent (test/manual PM ID).
              </Text>
              <InputRow label="Amount (cents)" value={intentAmount} onChangeText={setIntentAmount} keyboardType="number-pad" />
              <InputRow label="Description" value={intentDesc} onChangeText={setIntentDesc} />
              <DropdownRow
                label="Type"
                value={intentType}
                options={[
                  { label: "Subscription", value: "subscription" },
                  { label: "Marketplace Service", value: "marketplace_service" },
                ]}
                onChange={(v) => setIntentType(v as any)}
              />
              <View style={styles.row}>
                <PrimaryBtn label="Create Intent" onPress={createSetupIntent} />
                <View style={{ width: 10 }} />
                <OutlineBtn label="Confirm" onPress={confirmPayment} />
              </View>
              <InputRow label="paymentMethodId" value={newPMId} onChangeText={setNewPMId} placeholder="pm_123…" />
            </Section>

            <Section title="Saved Payment Methods" icon="credit-card">
              {loading && !methods ? (
                <Loader />
              ) : methods && methods.length ? (
                methods.map((m) => (
                  <CardRow key={m.id}>
                    <Text style={styles.cardTitle}>
                      {m.brand?.toUpperCase()} •••• {m.last4} {m.isDefault ? " • default" : ""}
                    </Text>
                    <Text style={styles.cardSub}>
                      Expires {m.expMonth}/{m.expYear}
                    </Text>
                    <View style={styles.row}>
                      <OutlineBtn
                        small
                        label="Remove"
                        onPress={() =>
                          Alert.alert("Remove Method", `Remove ${m.brand} •••• ${m.last4}?`, [
                            { text: "Cancel", style: "cancel" },
                            { text: "Remove", style: "destructive", onPress: () => removeMethod(m.id) },
                          ])
                        }
                      />
                    </View>
                  </CardRow>
                ))
              ) : (
                <Empty text="No saved payment methods." />
              )}
            </Section>
          </>
        )}

        {tab === "methods" && (
          <Section title="Payment Methods" icon="credit-card">
            {loading && !methods ? (
              <Loader />
            ) : methods && methods.length ? (
              methods.map((m) => (
                <CardRow key={m.id}>
                  <Text style={styles.cardTitle}>
                    {m.brand?.toUpperCase()} •••• {m.last4} {m.isDefault ? " • default" : ""}
                  </Text>
                  <Text style={styles.cardSub}>
                    Expires {m.expMonth}/{m.expYear}
                  </Text>
                  <View style={styles.row}>
                    <OutlineBtn
                      small
                      label="Remove"
                      onPress={() =>
                        Alert.alert("Remove Method", `Remove ${m.brand} •••• ${m.last4}?`, [
                          { text: "Cancel", style: "cancel" },
                          { text: "Remove", style: "destructive", onPress: () => removeMethod(m.id) },
                        ])
                      }
                    />
                  </View>
                </CardRow>
              ))
            ) : (
              <Empty text="No saved payment methods." />
            )}
            <Text style={styles.helpText}>
              Add methods via your billing UI (Stripe Elements) and they’ll show here.
            </Text>
          </Section>
        )}

        {tab === "subscription" && (
          <>
            <Section title="Manage Subscription" icon="star">
              <DropdownRow
                label="Tier"
                value={subTier}
                options={[
                  { label: "Premium", value: "premium" },
                  { label: "Pro", value: "pro" },
                ]}
                onChange={(v) => {
                  setSubTier(v as any);
                  setSubPriceId(v === "pro" ? "price_pro_monthly" : "price_premium_monthly");
                }}
              />
              <InputRow label="priceId" value={subPriceId} onChangeText={setSubPriceId} />
              <InputRow label="paymentMethodId" value={newPMId} onChangeText={setNewPMId} placeholder="pm_123…" />
              <View style={styles.row}>
                <PrimaryBtn label="Create" onPress={createSubscription} />
                <View style={{ width: 10 }} />
                <OutlineBtn label="Update" onPress={updateSubscription} />
                <View style={{ width: 10 }} />
                <OutlineBtn label="Cancel at Period End" onPress={cancelSubscription} />
              </View>
            </Section>

            {subState?.status ? (
              <Section title="Current Subscription" icon="info">
                <CardRow>
                  <Text style={styles.cardTitle}>Status: {subState.status}</Text>
                  <Text style={styles.cardSub}>
                    Tier: {subState.tier || subTier}{"\n"}
                    Renews: {subState.currentPeriodEnd ? dateShort(subState.currentPeriodEnd) : "—"}
                  </Text>
                </CardRow>
              </Section>
            ) : null}
          </>
        )}

        {tab === "history" && (
          <Section title="Payment History" icon="clock">
            {loading && !history ? (
              <Loader />
            ) : history && history.length ? (
              <>
                {history.map((p) => (
                  <CardRow key={p._id}>
                    <Text style={styles.cardTitle}>
                      {centsToUSD(p.amount)} • {p.status.toUpperCase()}
                    </Text>
                    <Text style={styles.cardSub}>
                      {p.currency?.toUpperCase()} • {p.paymentType || "—"}{"\n"}
                      {dateShort(p.createdAt)}
                    </Text>
                  </CardRow>
                ))}
                <Pagination
                  page={historyPage}
                  pages={historyPages}
                  onPrev={() => historyPage > 1 && loadHistory(historyPage - 1)}
                  onNext={() => historyPage < historyPages && loadHistory(historyPage + 1)}
                />
              </>
            ) : (
              <Empty text="No history yet." />
            )}
          </Section>
        )}

        {tab === "payouts" && (
          <>
            <Section title="Creator Payouts" icon="dollar-sign">
              <Text style={styles.helpText}>Connect your Stripe account and request payouts.</Text>
              <Text style={styles.sectionLabel}>Stripe Connect Setup</Text>
              <InputRow label="Email" value={connectEmail} onChangeText={setConnectEmail} keyboardType="email-address" />
              <View style={styles.grid2}>
                <InputRow label="First Name" value={connectFName} onChangeText={setConnectFName} />
                <InputRow label="Last Name" value={connectLName} onChangeText={setConnectLName} />
              </View>
              <View style={styles.grid2}>
                <InputRow label="Country" value={connectCountry} onChangeText={setConnectCountry} />
                <InputRow label="State" value={connectState} onChangeText={setConnectState} />
              </View>
              <View style={styles.grid2}>
                <InputRow label="City" value={connectCity} onChangeText={setConnectCity} />
                <InputRow label="Postal Code" value={connectPostal} onChangeText={setConnectPostal} keyboardType="numbers-and-punctuation" />
              </View>
              <InputRow label="Address line 1" value={connectLine1} onChangeText={setConnectLine1} />
              <View style={styles.row}>
                <PrimaryBtn label="Start Setup" onPress={setupCreatorPayoutAccount} />
                <View style={{ width: 10 }} />
                <OutlineBtn label="Check Status" onPress={checkPayoutStatus} />
              </View>
            </Section>

            <Section title="Request a Payout" icon="send">
              <InputRow label="Amount (cents)" value={payoutAmount} onChangeText={setPayoutAmount} keyboardType="number-pad" />
              <InputRow label="Type" value={payoutType} onChangeText={setPayoutType} />
              <PrimaryBtn label="Request Payout" onPress={requestPayout} />
            </Section>

            <Section title="Payout History" icon="list">
              {loading && !payouts ? (
                <Loader />
              ) : payouts && payouts.length ? (
                <>
                  {payouts.map((p) => (
                    <CardRow key={p._id}>
                      <Text style={styles.cardTitle}>
                        {/* The example shows amount as 50.00 (dollars string). Render loosely. */}
                        Amount: {typeof p.amount === "number" && p.amount > 999 ? formatUSDLoose(p.amount / 100) : formatUSDLoose(p.amount)}
                      </Text>
                      <Text style={styles.cardSub}>
                        {p.currency?.toUpperCase()} • {p.status.toUpperCase()} • {p.type}
                        {"\n"}Created: {dateShort(p.createdAt)}
                        {p.estimatedArrival ? `\nETA: ${dateShort(p.estimatedArrival)}` : ""}
                      </Text>
                    </CardRow>
                  ))}
                  <Pagination
                    page={payoutsPage}
                    pages={payoutsPages}
                    onPrev={() => payoutsPage > 1 && loadPayouts(payoutsPage - 1)}
                    onNext={() => payoutsPage < payoutsPages && loadPayouts(payoutsPage + 1)}
                  />
                </>
              ) : (
                <Empty text="No payouts yet." />
              )}
            </Section>
          </>
        )}

        {loading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** =========================
 *  UI Bits
 *  ========================= */
function TabBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function CardRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Pagination({
  page,
  pages,
  onPrev,
  onNext,
}: {
  page: number;
  pages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <View style={[styles.row, { justifyContent: "space-between", marginTop: 8 }]}>
      <OutlineBtn label="Prev" onPress={onPrev} disabled={page <= 1} />
      <Text style={styles.pageText}>
        Page {page} / {pages}
      </Text>
      <OutlineBtn label="Next" onPress={onNext} disabled={page >= pages} />
    </View>
  );
}

function Loader() {
  return (
    <View style={{ paddingVertical: 8 }}>
      <ActivityIndicator />
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Feather name="inbox" size={18} color="#777" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function PrimaryBtn({
  label,
  onPress,
  small,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={{ flex: small ? 0 : 1 }}>
      <LinearGradient
        colors={["#6C63FF", "#A48CFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.primaryBtn, small && { paddingVertical: 8, paddingHorizontal: 14 }, disabled && { opacity: 0.6 }]}
      >
        <Text style={styles.primaryBtnText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function OutlineBtn({
  label,
  onPress,
  small,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.outlineBtn,
        small && { paddingVertical: 8, paddingHorizontal: 14, height: undefined },
        disabled && { opacity: 0.6 },
      ]}
    >
      <Text style={styles.outlineBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function InputRow({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "email-address" | "numbers-and-punctuation";
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#aaa"
          keyboardType={keyboardType || "default"}
          style={styles.input}
        />
      </View>
    </View>
  );
}

function DropdownRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  // Simple faux dropdown (tap cycles). Replace with a real picker if you prefer.
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const next = () => onChange(options[(idx + 1) % options.length].value);
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity onPress={next} style={[styles.inputWrap, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
        <Text style={[styles.input, { paddingVertical: 10 }]}>{options[idx]?.label || value}</Text>
        <Feather name="chevrons-down" size={16} color="#555" style={{ marginRight: 10 }} />
      </TouchableOpacity>
    </View>
  );
}

/** =========================
 *  Styles
 *  ========================= */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7fb" },
  header: { paddingTop: Platform.select({ ios: 8, android: 12 }), paddingHorizontal: 16, paddingBottom: 14, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  tabRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, gap: 8 },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 999 },
  tabBtnActive: { backgroundColor: "rgba(255,255,255,0.35)" },
  tabText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: "#fff" },

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

  content: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },
  section: { backgroundColor: "#fff", borderRadius: 16, padding: 12, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#333" },
  sectionLabel: { marginTop: 4, marginBottom: 6, fontSize: 12, color: "#555", fontWeight: "600" },

  grid2: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  metric: { flexBasis: "48%", backgroundColor: "#f5f5ff", padding: 12, borderRadius: 14 },
  metricLabel: { color: "#666", fontSize: 12, marginBottom: 4 },
  metricValue: { color: "#333", fontSize: 16, fontWeight: "700" },

  card: { backgroundColor: "#fafafa", borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#eee" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#333" },
  cardSub: { fontSize: 12, color: "#666", marginTop: 2 },

  row: { flexDirection: "row", alignItems: "center" },

  primaryBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  outlineBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
  },
  outlineBtnText: { color: "#6C63FF", fontWeight: "700", fontSize: 14 },

  inputLabel: { fontSize: 12, color: "#666", marginBottom: 4, marginLeft: 4, fontWeight: "600" },
  inputWrap: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  input: { fontSize: 14, color: "#333", paddingVertical: 8 },

  helpText: { fontSize: 12, color: "#666", marginBottom: 8 },

  pageText: { fontSize: 12, color: "#555" },

  empty: { paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  emptyText: { color: "#777", fontSize: 12 },
});
