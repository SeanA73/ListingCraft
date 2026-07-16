import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { TEST_IDS } from "@/constants/listingIds";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Sparkles } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function googleAuthUrl() {
  const redirectUrl = window.location.origin + "/dashboard";
  return `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register(email, password, name);
      toast.success("Account created");
      navigate("/generator");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <span className="inline-flex w-12 h-12 rounded-full bg-terracotta items-center justify-center text-white mb-3">
            <Sparkles className="w-5 h-5" />
          </span>
          <h1 className="font-serif text-3xl text-ink">Create your account</h1>
          <p className="text-subink text-sm mt-1">3 free listings on us. No card needed.</p>
        </div>

        <div className="bg-white rounded-2xl border border-edge p-8 shadow-card">
          <a
            href={googleAuthUrl()}
            data-testid={TEST_IDS.authGoogle}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-edge bg-white hover:bg-surfaceCream text-ink transition-colors duration-200"
          >
            <img alt="Google" src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-4 h-4" />
            Continue with Google
          </a>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-edge" />
            <span className="text-xs uppercase tracking-widest text-mutedink">or</span>
            <div className="flex-1 h-px bg-edge" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-subink block mb-1">Your name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid={TEST_IDS.authName}
                className="w-full px-4 py-2.5 rounded-xl border border-edge bg-white focus:outline-none focus:ring-2 focus:ring-terracotta focus:bg-highlightCream/60 transition-colors duration-200"
              />
            </div>
            <div>
              <label className="text-sm text-subink block mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid={TEST_IDS.authEmail}
                className="w-full px-4 py-2.5 rounded-xl border border-edge bg-white focus:outline-none focus:ring-2 focus:ring-terracotta focus:bg-highlightCream/60 transition-colors duration-200"
              />
            </div>
            <div>
              <label className="text-sm text-subink block mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid={TEST_IDS.authPassword}
                className="w-full px-4 py-2.5 rounded-xl border border-edge bg-white focus:outline-none focus:ring-2 focus:ring-terracotta focus:bg-highlightCream/60 transition-colors duration-200"
              />
              <p className="text-xs text-mutedink mt-1">At least 6 characters.</p>
            </div>
            <button
              type="submit"
              disabled={busy}
              data-testid={TEST_IDS.authSubmit}
              className="w-full px-4 py-2.5 rounded-full bg-terracotta hover:bg-terracottaDark text-white transition-colors duration-200 disabled:opacity-60"
            >
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-subink mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-terracotta hover:underline" data-testid={TEST_IDS.authToLogin}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
