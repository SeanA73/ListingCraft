import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Sparkles, LibraryBig, ArrowRight, TrendingUp, Zap } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    api.get("/listings").then((r) => setRecent(r.data.slice(0, 6))).catch(() => {});
  }, []);

  const usedPct = user?.limits?.monthly_generations
    ? Math.min(100, Math.round(100 * (user.generations_used_this_period / user.limits.monthly_generations)))
    : 0;
  const isUnlimited = user?.limits?.monthly_generations == null;

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-10">
        <div className="mb-10">
          <p className="text-sm text-mutedink uppercase tracking-widest">Dashboard</p>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink mt-1">
            Hello, {user?.name?.split(" ")[0] || "maker"}.
          </h1>
          <p className="text-subink mt-2">Let's write something worth pasting into Etsy.</p>
        </div>

        {/* Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Primary action */}
          <Link
            to="/generator"
            className="md:col-span-2 rounded-2xl bg-teal text-white p-8 flex flex-col justify-between hover:-translate-y-0.5 transition-transform duration-200 grain-overlay relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl">Generate a new listing</h2>
              <p className="text-white/80 max-w-md mt-2">
                Paste your product, upload a photo, get an SEO-ready title, 13 tags, and description.
              </p>
            </div>
            <div className="mt-8 inline-flex items-center gap-2 text-sm relative z-10">
              Start now <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Usage */}
          <div className="rounded-2xl bg-white border border-edge p-6">
            <div className="text-xs text-mutedink uppercase tracking-widest">Monthly usage</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-serif text-4xl text-ink">{user?.generations_used_this_period || 0}</span>
              <span className="text-subink text-sm">/ {isUnlimited ? "∞" : user?.limits?.monthly_generations}</span>
            </div>
            <div className="mt-3 h-2 bg-surfaceCream rounded-full overflow-hidden">
              <div className="h-full bg-terracotta rounded-full transition-all duration-500" style={{ width: `${isUnlimited ? 20 : usedPct}%` }} />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs px-2.5 py-1 rounded-full bg-highlightCream text-terracotta border border-terracottaLight capitalize">
                {user?.plan} plan
              </span>
              {user?.plan === "free" && (
                <Link to="/pricing" className="text-xs text-teal hover:underline">Upgrade</Link>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-edge p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-terracottaLight flex items-center justify-center text-terracotta">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="font-serif text-lg text-ink">Rank higher</div>
              <p className="text-sm text-subink mt-1">Every generation front-loads your primary keyword and uses all 13 tag slots.</p>
            </div>
          </div>

          <Link to="/library" className="rounded-2xl bg-white border border-edge p-6 flex items-start gap-4 hover:shadow-cardHover transition-shadow duration-200">
            <div className="w-10 h-10 rounded-full bg-tealLight flex items-center justify-center text-teal">
              <LibraryBig className="w-5 h-5" />
            </div>
            <div>
              <div className="font-serif text-lg text-ink">Your library</div>
              <p className="text-sm text-subink mt-1">Every generated listing saved, searchable, duplicable.</p>
            </div>
          </Link>

          <Link to="/pricing" className="rounded-2xl bg-white border border-edge p-6 flex items-start gap-4 hover:shadow-cardHover transition-shadow duration-200">
            <div className="w-10 h-10 rounded-full bg-highlightCream flex items-center justify-center text-terracotta">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="font-serif text-lg text-ink">Go Pro</div>
              <p className="text-sm text-subink mt-1">Unlimited generations, bulk mode, CSV export.</p>
            </div>
          </Link>
        </div>

        {/* Recent listings */}
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-serif text-2xl text-ink">Recent listings</h2>
          <Link to="/library" className="text-sm text-teal hover:underline">Open library</Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl border border-edge border-dashed bg-white p-10 text-center text-subink">
            You haven't generated any listings yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((l) => (
              <Link
                key={l.listing_id}
                to={`/generator/${l.listing_id}`}
                className="rounded-2xl bg-white border border-edge p-5 hover:shadow-cardHover transition-shadow duration-200"
              >
                <div className="text-xs text-mutedink">{new Date(l.created_at).toLocaleDateString()}</div>
                <div className="mt-1 text-ink font-medium line-clamp-2">{l.generated?.title || "Untitled"}</div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-tealLight/60 text-teal">Score {l.score?.total || 0}</span>
                  <span className="text-xs text-mutedink">{l.generated?.tags?.length || 0} tags</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
