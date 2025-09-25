// app/(main)/matchmaker/index.tsx   ← or app/main/... if you didn't use parentheses
import { Redirect } from "expo-router";

export default function MatchmakerIndex() {
  return <Redirect href="/matchmaker/how-it-works" />; // ✅ no "/main"
}