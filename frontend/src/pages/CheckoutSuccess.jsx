import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState("pending"); // pending | paid | expired | error
  const attempts = useRef(0);
  const { refresh } = useAuth();

  useEffect(() => {
    if (!sessionId) { setState("error"); return; }
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      if (attempts.current >= 6) { setState("expired"); return; }
      attempts.current += 1;
      try {
        const r = await api.get(`/payments/status/${sessionId}`);
        if (r.data.payment_status === "paid") {
          setState("paid");
          await refresh();
          return;
        }
        if (r.data.status === "expired" || r.data.payment_status === "expired") {
          setState("expired");
          return;
        }
        setTimeout(poll, 2000);
      } catch {
        setState("error");
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId, refresh]);

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="max-w-lg mx-auto px-6 py-20 text-center">
        {state === "pending" && (
          <>
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-terracotta" />
            <h1 className="font-serif text-3xl text-ink mt-6">Confirming your payment…</h1>
            <p className="text-subink text-sm mt-2">This usually takes a few seconds.</p>
          </>
        )}
        {state === "paid" && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-teal" />
            <h1 className="font-serif text-3xl text-ink mt-6">You're upgraded.</h1>
            <p className="text-subink mt-2">Your plan is active. Time to write some listings.</p>
            <Link to="/generator" className="inline-block mt-8 px-6 py-3 rounded-full bg-terracotta text-white hover:bg-terracottaDark transition-colors duration-200">
              Open the Generator
            </Link>
          </>
        )}
        {state === "expired" && (
          <>
            <XCircle className="w-12 h-12 mx-auto text-mutedink" />
            <h1 className="font-serif text-3xl text-ink mt-6">The payment session expired.</h1>
            <p className="text-subink mt-2">Nothing was charged. Try again from the pricing page.</p>
            <Link to="/pricing" className="inline-block mt-8 px-6 py-3 rounded-full bg-terracotta text-white hover:bg-terracottaDark transition-colors duration-200">
              Back to pricing
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="w-12 h-12 mx-auto text-terracotta" />
            <h1 className="font-serif text-3xl text-ink mt-6">Something went wrong.</h1>
            <p className="text-subink mt-2">Please check your email or try again.</p>
            <Link to="/pricing" className="inline-block mt-8 px-6 py-3 rounded-full bg-terracotta text-white hover:bg-terracottaDark transition-colors duration-200">
              Back to pricing
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
