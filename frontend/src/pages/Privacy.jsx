import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-sm text-mutedink uppercase tracking-widest">Privacy Policy</p>
        <h1 className="font-serif text-4xl text-ink mt-2">Privacy</h1>
        <div className="prose prose-neutral mt-8 text-subink text-sm space-y-4">
          <p>We collect the minimum to run the product: your email, a name, and the listings you generate.</p>
          <h2 className="font-serif text-xl text-ink mt-8">Data we store</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>Account: email, name, optional Google profile photo.</li>
            <li>Generated listings and their inputs.</li>
            <li>Payment records via Stripe — we never see your card number.</li>
          </ul>
          <h2 className="font-serif text-xl text-ink mt-8">Product photos</h2>
          <p>
            If you upload a product photo, it's sent to our LLM provider for one-time analysis and is not stored
            on our servers after the request completes.
          </p>
          <h2 className="font-serif text-xl text-ink mt-8">Delete your data</h2>
          <p>Email <span className="font-mono">privacy@listingcraft.app</span> — we'll delete your account within 7 days.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
