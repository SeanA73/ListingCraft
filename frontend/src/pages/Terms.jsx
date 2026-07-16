import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-sm text-mutedink uppercase tracking-widest">Terms of Service</p>
        <h1 className="font-serif text-4xl text-ink mt-2">Terms</h1>
        <div className="prose prose-neutral mt-8 text-subink text-sm space-y-4">
          <p>
            Welcome to ListingCraft. By using our service, you agree to these terms. This is a
            reasonable-boilerplate summary; if we ever change materially, we'll notify you.
          </p>
          <h2 className="font-serif text-xl text-ink mt-8">1. What we do</h2>
          <p>ListingCraft generates AI-assisted Etsy listing copy. We do not publish to Etsy on your behalf.</p>
          <h2 className="font-serif text-xl text-ink mt-8">2. Your content</h2>
          <p>You own the listings you generate. We store them so you can search and re-export.</p>
          <h2 className="font-serif text-xl text-ink mt-8">3. Honest output</h2>
          <p>
            Our AI is prompted never to invent materials, dimensions, or claims. Placeholders like
            <span className="mx-1 font-mono text-terracotta">[DIMENSIONS]</span>
            appear where you didn't provide info — please fill them in before publishing.
          </p>
          <h2 className="font-serif text-xl text-ink mt-8">4. Payments</h2>
          <p>Paid plans are billed via Stripe. Plans extend your access until the expiry date; you can let them lapse anytime.</p>
          <h2 className="font-serif text-xl text-ink mt-8">5. No affiliation</h2>
          <p>ListingCraft is not affiliated with, endorsed by, or approved by Etsy, Inc.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
