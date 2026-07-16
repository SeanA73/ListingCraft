import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { TEST_IDS } from "@/constants/listingIds";
import { Check, Loader2 } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    tagline: "Try the workflow, no strings.",
    features: [
      "3 listing generations / month",
      "Up to 5 saved listings",
      "Copy-paste to Etsy",
      "Listing score + checklist",
    ],
    cta: "Start free",
    testId: TEST_IDS.pricingFree,
  },
  {
    id: "starter",
    name: "Starter",
    monthly: 9,
    yearly: 90,
    tagline: "For growing solo shops.",
    highlight: false,
    features: [
      "50 generations / month",
      "Full library, no cap",
      "Keyword ideas panel",
      "All 4 tone selectors",
      "Priority email support",
    ],
    cta: "Choose Starter",
    testId: TEST_IDS.pricingStarter,
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 19,
    yearly: 190,
    tagline: "For shops with 100+ listings.",
    highlight: true,
    features: [
      "Unlimited generations",
      "Bulk mode — 10 products at once",
      "CSV export (Vela-ready)",
      "Everything in Starter",
      "Priority support",
    ],
    cta: "Choose Pro",
    testId: TEST_IDS.pricingPro,
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cycle, setCycle] = useState("monthly"); // monthly | annual
  const [busy, setBusy] = useState(null);

  const onCheckout = async (plan) => {
    if (!user) {
      navigate("/register");
      return;
    }
    if (plan === "free") {
      navigate("/generator");
      return;
    }
    const packageId = cycle === "annual" ? `${plan}_annual` : `${plan}_monthly`;
    setBusy(packageId);
    try {
      const r = await api.post("/payments/checkout", {
        package_id: packageId,
        origin_url: window.location.origin,
      });
      window.location.href = r.data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Checkout failed");
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
        <div className="max-w-2xl">
          <p className="text-sm text-mutedink uppercase tracking-widest">Pricing</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-ink mt-1">
            Plans that match your shop.
          </h1>
          <p className="mt-4 text-subink">
            Start free. Upgrade only when your generations tell you it's time.
          </p>
        </div>

        <div className="mt-8 inline-flex items-center gap-1 bg-white border border-edge rounded-full p-1">
          {["monthly", "annual"].map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`px-4 py-1.5 rounded-full text-sm capitalize transition-colors duration-200 ${
                cycle === c ? "bg-terracotta text-white" : "text-subink hover:text-ink"
              }`}
            >
              {c === "annual" ? "Annual · 2 months free" : c}
            </button>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((p) => {
            const priceMonthly = p.monthly;
            const priceYearly = p.yearly;
            const shownPrice = cycle === "annual" && p.id !== "free" ? priceYearly : priceMonthly;
            const perLabel = p.id === "free" ? "" : cycle === "annual" ? " / year" : " / mo";
            const isCurrent = user?.plan === p.id;
            return (
              <div
                key={p.id}
                className={`rounded-2xl p-8 flex flex-col ${
                  p.highlight
                    ? "bg-teal text-white border border-teal"
                    : "bg-white text-ink border border-edge"
                }`}
              >
                <div className="text-sm uppercase tracking-widest opacity-70">{p.name}</div>
                <div className="mt-3 font-serif text-4xl flex items-baseline gap-1">
                  ${shownPrice}
                  <span className={`text-sm ${p.highlight ? "text-white/70" : "text-mutedink"}`}>{perLabel}</span>
                </div>
                <p className={`text-sm mt-2 ${p.highlight ? "text-white/80" : "text-subink"}`}>{p.tagline}</p>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className={`w-4 h-4 mt-0.5 ${p.highlight ? "text-tealLight" : "text-teal"}`} />
                      <span className={p.highlight ? "text-white/90" : "text-subink"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  disabled={busy || isCurrent}
                  onClick={() => onCheckout(p.id)}
                  data-testid={p.testId}
                  className={`mt-8 px-5 py-3 rounded-full transition-colors duration-200 inline-flex items-center justify-center gap-2 ${
                    p.highlight
                      ? "bg-white text-teal hover:bg-tealLight"
                      : "bg-terracotta text-white hover:bg-terracottaDark"
                  } disabled:opacity-60`}
                >
                  {busy === `${p.id}_${cycle}` && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isCurrent ? "Current plan" : p.cta}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-14 text-sm text-mutedink max-w-2xl">
          Payments are processed by Stripe. This app uses Stripe test mode — use card{" "}
          <span className="font-mono">4242 4242 4242 4242</span>, any future date, any CVC.
        </div>
      </main>
      <Footer />
    </div>
  );
}
