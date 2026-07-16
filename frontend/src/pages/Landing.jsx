import React from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { TEST_IDS } from "@/constants/listingIds";
import { ArrowRight, Check, X, Copy, Sparkles, ShieldCheck, Tag, Ruler, Wand2 } from "lucide-react";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

const BEFORE_TITLE = "Handmade Painting Original Art Wall Decor Home Beautiful Sunset";
const AFTER_TITLE = "Ocean Sunset Painting | Original Acrylic Coastal Wall Art | 16x20 Warm Beach House Decor Gift";

const BEFORE_TAGS = ["painting", "art", "wall art", "handmade", "beautiful", "decor", "home", "sunset", "canvas"];
const AFTER_TAGS = [
  "ocean sunset art", "coastal wall art", "acrylic painting", "beach house decor",
  "original painting", "sunset wall decor", "living room art", "16x20 canvas art",
  "warm coastal decor", "housewarming gift", "teal orange art", "seascape painting", "handpainted canvas",
];

export default function Landing() {
  return (
    <div className="bg-cream min-h-screen">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden bg-noise grain-overlay">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-20 pb-24 lg:pt-28 lg:pb-32 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-edge bg-white text-xs text-subink mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-terracotta" />
              Built for Etsy sellers who’d rather be making
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-ink leading-[1.05]">
              Etsy listings that <span className="text-terracotta">actually rank</span>.<br className="hidden sm:block" />
              Paste your product. Copy the listing.
            </h1>
            <p className="mt-6 text-lg text-subink max-w-2xl">
              ListingCraft writes your title, all 13 tags, and a buyer-ready description in seconds —
              front-loaded for Etsy search, honest about your specs, and ready to paste.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-terracotta hover:bg-terracottaDark text-white transition-transform duration-200 hover:-translate-y-0.5"
                data-testid={TEST_IDS.heroCta}
              >
                Generate your first listing free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-edge bg-white hover:bg-surfaceCream text-ink transition-colors duration-200"
                data-testid={TEST_IDS.heroCtaSecondary}
              >
                See pricing
              </Link>
            </div>
            <p className="mt-4 text-xs text-mutedink">No credit card. 3 free listings on us.</p>
          </div>

          <div className="lg:col-span-5 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="relative">
              <div className="absolute -inset-6 bg-terracottaLight/40 blur-2xl rounded-3xl -z-10" />
              <div className="rounded-2xl border border-edge bg-white p-6 shadow-card">
                <div className="text-xs uppercase tracking-widest text-mutedink mb-3">Listing preview</div>
                <div className="text-sm text-subink mb-2">Title</div>
                <div className="font-medium text-ink leading-snug mb-4">{AFTER_TITLE}</div>
                <div className="text-sm text-subink mb-2">13 Etsy tags</div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {AFTER_TAGS.map((t) => (
                    <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-tealLight/60 text-teal border border-tealLight">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-subink mb-2">Score</div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-serif text-teal">94</div>
                  <div className="text-xs text-mutedink max-w-[200px]">
                    Title front-loaded, all 13 tags used, description snippet-ready.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BEFORE / AFTER */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20 lg:py-24">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl sm:text-4xl text-ink">See what changes.</h2>
          <p className="mt-3 text-subink">
            One example, same product. Notice where the keywords land and how many tag slots get used.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before */}
          <div className="rounded-2xl border border-edge bg-white p-8">
            <div className="flex items-center gap-2 text-xs text-mutedink uppercase tracking-widest mb-4">
              <X className="w-4 h-4 text-terracotta" /> Weak listing
            </div>
            <div className="text-sm text-subink mb-2">Title (60 chars)</div>
            <div className="text-ink mb-6">{BEFORE_TITLE}</div>
            <div className="text-sm text-subink mb-2">Tags (9 of 13)</div>
            <div className="flex flex-wrap gap-1.5">
              {BEFORE_TAGS.map((t) => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-surfaceCream text-subink border border-edge">
                  {t}
                </span>
              ))}
            </div>
            <ul className="mt-6 space-y-2 text-sm text-subink">
              <li className="flex items-start gap-2"><X className="w-4 h-4 text-terracotta mt-0.5" /> Primary keyword buried mid-title</li>
              <li className="flex items-start gap-2"><X className="w-4 h-4 text-terracotta mt-0.5" /> 4 tag slots wasted</li>
              <li className="flex items-start gap-2"><X className="w-4 h-4 text-terracotta mt-0.5" /> No buyer-intent tags</li>
            </ul>
          </div>

          {/* After */}
          <div className="rounded-2xl border border-tealLight bg-white p-8 shadow-card">
            <div className="flex items-center gap-2 text-xs text-teal uppercase tracking-widest mb-4">
              <Check className="w-4 h-4" /> Optimized with ListingCraft
            </div>
            <div className="text-sm text-subink mb-2">Title (135 chars)</div>
            <div className="text-ink mb-6 leading-snug">{AFTER_TITLE}</div>
            <div className="text-sm text-subink mb-2">Tags (13 of 13)</div>
            <div className="flex flex-wrap gap-1.5">
              {AFTER_TAGS.map((t) => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-tealLight/60 text-teal border border-tealLight">
                  {t}
                </span>
              ))}
            </div>
            <ul className="mt-6 space-y-2 text-sm text-subink">
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-teal mt-0.5" /> Primary keyword in first 40 chars</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-teal mt-0.5" /> All 13 tag slots used, avg 15 chars</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-teal mt-0.5" /> Broad + niche + buyer-intent tags</li>
            </ul>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20 lg:py-24">
        <h2 className="font-serif text-3xl sm:text-4xl text-ink max-w-2xl">A tool that respects your shop.</h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Wand2,
              title: "Paste your product",
              body: "A rough description or a photo. That's all we need — the AI does the SEO math.",
            },
            {
              icon: Tag,
              title: "13 tags, always",
              body: "Every slot filled with multi-word long-tail phrases. No duplicates, no wasted characters.",
            },
            {
              icon: Ruler,
              title: "Honest placeholders",
              body: "We never invent materials or dimensions. Missing specs get [PLACEHOLDERS] you fill in.",
            },
            {
              icon: ShieldCheck,
              title: "Etsy-policy safe",
              body: 'We won\'t write "handmade" or "vintage" unless you told us that\'s what you sell.',
            },
            {
              icon: Copy,
              title: "One-click copy paste",
              body: "Each field has its own copy button. Or copy the whole listing in Etsy form order.",
            },
            {
              icon: Sparkles,
              title: "Score with a checklist",
              body: "See exactly why the listing is strong — and where to push for higher relevance.",
            },
          ].map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="rounded-2xl border border-edge bg-white p-8 hover:shadow-cardHover transition-shadow duration-200 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="w-10 h-10 rounded-full bg-highlightCream border border-edge flex items-center justify-center text-terracotta mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <div className="font-serif text-xl text-ink mb-2">{title}</div>
              <p className="text-sm text-subink leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20 lg:py-24">
        <div className="rounded-3xl bg-teal text-white p-10 lg:p-14 grain-overlay relative overflow-hidden">
          <div className="max-w-2xl relative z-10">
            <h2 className="font-serif text-3xl sm:text-4xl">Three plans. Zero fluff.</h2>
            <p className="mt-3 text-white/80">
              Start free with 3 listings. Move to Starter or Pro when your shop is growing.
            </p>
            <Link to="/pricing" className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-white text-teal rounded-full hover:bg-tealLight transition-colors duration-200">
              See pricing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-20 lg:py-24">
        <h2 className="font-serif text-3xl sm:text-4xl text-ink">Questions.</h2>
        <div className="mt-8">
          <Accordion type="single" collapsible>
            <AccordionItem value="q1">
              <AccordionTrigger className="text-left">Do you connect to my Etsy shop?</AccordionTrigger>
              <AccordionContent className="text-subink">
                Not yet — Etsy's API requires shop-by-shop approval that most solo sellers can't get.
                What we do have is a <span className="text-terracotta font-medium">guided Publish-to-Etsy mode</span>: we
                walk you through the Etsy listing form field-by-field with a copy button for each piece.
                Direct publishing is on the roadmap.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger className="text-left">Will the AI invent details about my product?</AccordionTrigger>
              <AccordionContent className="text-subink">
                No. If you don't tell us dimensions or materials, the description gets a clearly marked
                <span className="mx-1 font-mono text-terracotta">[PLACEHOLDER]</span>
                you fill in before you paste. We also refuse to write "handmade" or "vintage" unless you said so.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger className="text-left">Can I upload a product photo?</AccordionTrigger>
              <AccordionContent className="text-subink">
                Yes. The AI reads the image (subject, style, colors, obvious materials) and uses that alongside
                your text description. It never invents things it can't see.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger className="text-left">What plans are there?</AccordionTrigger>
              <AccordionContent className="text-subink">
                Free (3 listings/mo, 5 saved), Starter $9/mo (50 listings, full library), Pro $19/mo (unlimited,
                bulk mode, CSV export). Annual = 2 months free.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger className="text-left">Do you charge extra for AI credits?</AccordionTrigger>
              <AccordionContent className="text-subink">
                No. Your plan includes the generations listed for the month. No hidden per-token surprises.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <Footer />
    </div>
  );
}
