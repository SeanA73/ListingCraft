import React from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { TEST_IDS } from "@/constants/listingIds";

export default function Account() {
  const { user, logout } = useAuth();

  const doLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        <p className="text-sm text-mutedink uppercase tracking-widest">Account</p>
        <h1 className="font-serif text-3xl sm:text-4xl text-ink mt-1">Your settings</h1>

        <div className="mt-8 rounded-2xl bg-white border border-edge p-8 space-y-6">
          <Row label="Name" value={user?.name || "—"} />
          <Row label="Email" value={user?.email} />
          <Row label="Plan" value={<span className="capitalize">{user?.plan}</span>} />
          {user?.plan !== "free" && user?.plan_expires_at && (
            <Row label="Renews / expires" value={new Date(user.plan_expires_at).toLocaleDateString()} />
          )}
          <Row label="Generations used" value={`${user?.generations_used_this_period ?? 0} / ${user?.limits?.monthly_generations ?? "∞"}`} />
          <div className="pt-4 border-t border-edge flex flex-wrap gap-3">
            <Link to="/pricing" className="px-5 py-2 rounded-full bg-terracotta text-white hover:bg-terracottaDark transition-colors duration-200 text-sm">
              Change plan
            </Link>
            <button
              onClick={doLogout}
              data-testid={TEST_IDS.logoutBtn}
              className="px-5 py-2 rounded-full border border-edge bg-white hover:bg-surfaceCream text-ink transition-colors duration-200 text-sm inline-flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>
        </div>

        <p className="text-xs text-mutedink mt-6">
          To cancel a paid plan, simply let it expire — you'll be moved back to Free automatically. To
          request a refund, email support.
        </p>
      </main>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-mutedink">{label}</div>
      <div className="text-ink">{value}</div>
    </div>
  );
}
