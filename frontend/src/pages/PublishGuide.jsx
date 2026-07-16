import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import CopyButton from "@/components/CopyButton";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, ExternalLink, Check, Circle,
  Image as ImageIcon, Type, FileText, Tag, Sparkles, Info,
  Loader2, PartyPopper,
} from "lucide-react";

/**
 * Guided "Publish to Etsy" checklist mode.
 * Walks the seller field-by-field, with the exact Etsy form location as a hint
 * and a big copy button for each ListingCraft output. Progress persists in
 * localStorage per listing so a user can pause and resume mid-publish.
 */

const STORAGE_KEY = (id) => `lc_publish_progress_${id}`;
const ETSY_NEW_LISTING = "https://www.etsy.com/your/shops/me/tools/listings/create";

export default function PublishGuide() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState({}); // { stepKey: true }
  const startedRef = React.useRef(false);

  // Fire-and-forget analytics; never blocks the UI or throws.
  const trackEvent = useCallback((eventType, meta = {}) => {
    api.post("/analytics/event", { event_type: eventType, metadata: { listing_id: id, ...meta } })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/listings/${id}`);
        setListing(r.data);
        const saved = localStorage.getItem(STORAGE_KEY(id));
        if (saved) {
          try {
            const p = JSON.parse(saved);
            setDone(p.done || {});
            setStepIndex(p.stepIndex || 0);
          } catch {}
        }
      } catch {
        toast.error("Listing not found");
        navigate("/library");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  // Fire publish_started exactly once per mount, after the listing loads.
  useEffect(() => {
    if (!listing || startedRef.current) return;
    startedRef.current = true;
    trackEvent("publish_started", { title_len: (listing.generated?.title || "").length });
  }, [listing, trackEvent]);

  const persist = useCallback((nextDone, nextIndex) => {
    localStorage.setItem(STORAGE_KEY(id), JSON.stringify({ done: nextDone, stepIndex: nextIndex }));
  }, [id]);

  const steps = useMemo(() => {
    if (!listing) return [];
    const g = listing.generated || {};
    const attrs = g.attributes || {};
    const altTexts = g.alt_text || [];
    return [
      {
        key: "title",
        heading: "Listing title",
        etsyHint: 'In Etsy: the "Title" field near the top of the listing form.',
        icon: Type,
        content: g.title || "",
        meta: `${(g.title || "").length} / 140 characters`,
        multiline: false,
      },
      {
        key: "description",
        heading: "Description",
        etsyHint: 'In Etsy: the "Description" text area. Placeholders in [BRACKETS] are for you to fill in first.',
        icon: FileText,
        content: g.description || "",
        meta: `${(g.description || "").length} characters — first 160 chars are your Google snippet.`,
        multiline: true,
      },
      {
        key: "tags",
        heading: "All 13 tags",
        etsyHint: 'In Etsy: the "Tags" section — paste each phrase into its own tag slot. Etsy allows up to 13.',
        icon: Tag,
        content: (g.tags || []).join(", "),
        chips: g.tags || [],
        meta: `${(g.tags || []).length} tags · paste one per slot`,
      },
      {
        key: "attributes",
        heading: "Category & attributes",
        etsyHint: 'In Etsy: the "Category", "Attributes", and "Personalization" panels. Copy each value into the matching dropdown.',
        icon: Sparkles,
        rows: [
          ["Category", listing.input?.category || attrs.style || ""],
          ["Occasion", attrs.occasion || ""],
          ["Style", attrs.style || ""],
          ["Room", attrs.room || ""],
          ["Recipient", attrs.recipient || ""],
          ["Primary color", attrs.primary_color || ""],
        ].filter(([, v]) => v),
      },
      {
        key: "photos",
        heading: `Photo alt text (${altTexts.length})`,
        etsyHint: 'In Etsy: after uploading each photo, click the pencil icon on the photo tile and paste the matching alt text.',
        icon: ImageIcon,
        alts: altTexts,
      },
      {
        key: "review",
        heading: "Final review",
        etsyHint: 'Almost there — a quick honesty check before you hit "Publish".',
        icon: PartyPopper,
        review: true,
      },
    ];
  }, [listing]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <Header />
        <div className="max-w-4xl mx-auto px-6 py-20 flex items-center gap-3 text-subink">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your listing…
        </div>
      </div>
    );
  }
  if (!listing) return null;

  const current = steps[stepIndex];
  const completedCount = Object.values(done).filter(Boolean).length;
  const totalSteps = steps.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);

  const markDone = (key, value = true) => {
    const next = { ...done, [key]: value };
    setDone(next);
    persist(next, stepIndex);
    if (value && !done[key]) trackEvent("publish_step_completed", { step: key, index: stepIndex });
  };
  const goto = (i) => {
    if (i < 0 || i >= totalSteps) return;
    setStepIndex(i);
    persist(done, i);
  };
  const goNext = () => {
    // auto-mark current done when advancing
    if (current && !done[current.key]) {
      const next = { ...done, [current.key]: true };
      setDone(next);
      persist(next, Math.min(stepIndex + 1, totalSteps - 1));
      trackEvent("publish_step_completed", { step: current.key, index: stepIndex });
    } else {
      persist(done, Math.min(stepIndex + 1, totalSteps - 1));
    }
    setStepIndex((i) => Math.min(i + 1, totalSteps - 1));
  };
  const goPrev = () => goto(stepIndex - 1);

  const finish = () => {
    const completedCount = Object.values({ ...done, [current.key]: true }).filter(Boolean).length;
    trackEvent("publish_completed", {
      steps_completed: completedCount,
      total_steps: totalSteps,
      plan: undefined, // backend joins user.plan itself
    });
    toast.success("Nice work — happy selling!");
    localStorage.removeItem(STORAGE_KEY(id));
    navigate(`/generator/${id}`);
  };

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <Link
            to={`/generator/${id}`}
            className="inline-flex items-center gap-2 text-sm text-subink hover:text-terracotta transition-colors duration-200"
            data-testid="publish-back-generator"
          >
            <ArrowLeft className="w-4 h-4" /> Back to generator
          </Link>
          <a
            href={ETSY_NEW_LISTING}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-terracotta hover:bg-terracottaDark text-white transition-colors duration-200"
            data-testid="publish-open-etsy"
          >
            Open Etsy listing form <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm text-mutedink uppercase tracking-widest">Publish to Etsy</p>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink mt-1 line-clamp-2">
            {listing.generated?.title || "Untitled listing"}
          </h1>
          <p className="text-subink text-sm mt-2 max-w-2xl">
            We'll walk you through your Etsy listing form field-by-field. Open Etsy in another tab,
            then copy each piece as we go.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            {steps.map((s, i) => {
              const isDone = !!done[s.key];
              const isCurrent = i === stepIndex;
              return (
                <button
                  key={s.key}
                  onClick={() => goto(i)}
                  className={`flex-1 h-1.5 rounded-full transition-colors duration-200 ${
                    isDone ? "bg-teal" : isCurrent ? "bg-terracotta" : "bg-edge"
                  }`}
                  aria-label={`Go to step ${i + 1}: ${s.heading}`}
                  data-testid={`publish-progress-${s.key}`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs text-mutedink">
            <span>Step {stepIndex + 1} of {totalSteps} · {current?.heading}</span>
            <span>{completedCount} done · {progressPct}%</span>
          </div>
        </div>

        {/* Two-column: hint left, content right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Etsy field hint */}
          <aside className="lg:col-span-4 bg-white rounded-2xl border border-edge p-6 lg:p-8 h-fit lg:sticky lg:top-24">
            <div className="w-10 h-10 rounded-full bg-highlightCream border border-edge flex items-center justify-center text-terracotta mb-4">
              {current?.icon ? React.createElement(current.icon, { className: "w-5 h-5" }) : <Info className="w-5 h-5" />}
            </div>
            <div className="font-serif text-xl text-ink mb-2">{current?.heading}</div>
            <p className="text-sm text-subink leading-relaxed">{current?.etsyHint}</p>

            {/* Etsy form mock */}
            <div className="mt-6 rounded-xl border border-edge bg-surfaceCream/50 p-4">
              <div className="text-[10px] uppercase tracking-widest text-mutedink mb-2">Etsy field preview</div>
              <EtsyFieldMock stepKey={current?.key} />
            </div>
          </aside>

          {/* Content to copy */}
          <section className="lg:col-span-8 bg-white rounded-2xl border border-edge p-6 lg:p-8">
            <StepContent step={current} />

            {/* Confirm + nav */}
            <div className="mt-8 pt-6 border-t border-edge flex flex-wrap items-center justify-between gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-ink select-none">
                <input
                  type="checkbox"
                  checked={!!done[current.key]}
                  onChange={(e) => markDone(current.key, e.target.checked)}
                  className="w-4 h-4 rounded border-edge text-terracotta focus:ring-terracotta"
                  data-testid={`publish-mark-${current.key}`}
                />
                <span>I pasted this into Etsy</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={goPrev}
                  disabled={stepIndex === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-edge bg-white hover:bg-surfaceCream text-ink transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none"
                  data-testid="publish-prev"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                {stepIndex < totalSteps - 1 ? (
                  <button
                    onClick={goNext}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-terracotta hover:bg-terracottaDark text-white transition-colors duration-200"
                    data-testid="publish-next"
                  >
                    Next step <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={finish}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-teal hover:bg-tealDark text-white transition-colors duration-200"
                    data-testid="publish-finish"
                  >
                    All done <PartyPopper className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/* ---------------- Sub-components ---------------- */

function StepContent({ step }) {
  if (!step) return null;

  if (step.review) {
    return <ReviewChecklist />;
  }

  if (step.chips) {
    // tags
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-mutedink">{step.meta}</div>
          <CopyButton text={step.content} label="Copy all 13" testId="publish-copy-tags-all" />
        </div>
        <div className="flex flex-wrap gap-2">
          {step.chips.map((t, i) => (
            <TagChip key={i} index={i + 1} text={t} />
          ))}
        </div>
      </div>
    );
  }

  if (step.rows) {
    return (
      <div>
        <div className="text-xs text-mutedink mb-3">
          Copy each value into the matching Etsy dropdown or field.
        </div>
        <ul className="space-y-2">
          {step.rows.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-edge bg-white hover:bg-surfaceCream/60 transition-colors duration-200">
              <div>
                <div className="text-xs text-mutedink">{k}</div>
                <div className="text-ink">{v}</div>
              </div>
              <CopyButton text={v} label="Copy" testId={`publish-copy-attr-${k.toLowerCase().replace(/\s+/g, "-")}`} />
            </li>
          ))}
          {step.rows.length === 0 && (
            <li className="text-sm text-mutedink">No attributes generated for this listing.</li>
          )}
        </ul>
      </div>
    );
  }

  if (step.alts) {
    return (
      <div>
        <div className="text-xs text-mutedink mb-3">
          One alt text per photo. Etsy lets you edit each photo's alt after upload.
        </div>
        <ol className="space-y-2">
          {step.alts.map((a, i) => (
            <li key={i} className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl border border-edge bg-white hover:bg-surfaceCream/60 transition-colors duration-200">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="w-6 h-6 rounded-full bg-highlightCream border border-terracottaLight text-terracotta text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-ink">{a}</span>
              </div>
              <CopyButton text={a} label="Copy" testId={`publish-copy-alt-${i + 1}`} />
            </li>
          ))}
          {step.alts.length === 0 && (
            <li className="text-sm text-mutedink">No alt text generated. Regenerate this field from the Generator to add SEO-friendly image alt text.</li>
          )}
        </ol>
      </div>
    );
  }

  // Title / Description default
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-mutedink">{step.meta}</div>
        <CopyButton
          text={step.content}
          label={step.multiline ? "Copy description" : "Copy title"}
          testId={`publish-copy-${step.key}`}
        />
      </div>
      {step.multiline ? (
        <pre className="whitespace-pre-wrap font-sans text-sm text-subink leading-relaxed bg-surfaceCream/40 rounded-xl border border-edge p-4">
          {step.content}
        </pre>
      ) : (
        <div className="text-ink leading-snug text-lg bg-surfaceCream/40 rounded-xl border border-edge p-4">
          {step.content}
        </div>
      )}
    </div>
  );
}

function TagChip({ index, text }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`Tag ${index} copied`);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Copy failed");
    }
  };
  return (
    <button
      onClick={onCopy}
      className="group inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full border border-tealLight bg-tealLight/50 hover:bg-tealLight text-teal transition-colors duration-200"
      data-testid={`publish-tag-chip-${index}`}
    >
      <span className="w-5 h-5 rounded-full bg-white text-teal text-[10px] flex items-center justify-center">
        {index}
      </span>
      <span className="text-sm">{text}</span>
      <span className="text-[10px] text-teal/70 group-hover:text-teal">
        {copied ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </span>
    </button>
  );
}

function EtsyFieldMock({ stepKey }) {
  const box = "block bg-white border border-edge rounded-lg text-mutedink";
  const label = "text-[11px] text-mutedink mb-1";
  switch (stepKey) {
    case "title":
      return (
        <div>
          <div className={label}>Title *</div>
          <div className={`${box} h-8 px-2 text-xs flex items-center`}>Include keywords buyers would use…</div>
        </div>
      );
    case "description":
      return (
        <div>
          <div className={label}>Description *</div>
          <div className={`${box} h-20 px-2 py-1 text-xs`}>Start with a brief overview…</div>
        </div>
      );
    case "tags":
      return (
        <div>
          <div className={label}>Tags · 0/13</div>
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${box} h-6`} />
            ))}
          </div>
        </div>
      );
    case "attributes":
      return (
        <div className="space-y-2">
          <div>
            <div className={label}>Category</div>
            <div className={`${box} h-6 px-2 text-xs flex items-center`}>Select ▾</div>
          </div>
          <div>
            <div className={label}>Occasion</div>
            <div className={`${box} h-6 px-2 text-xs flex items-center`}>Select ▾</div>
          </div>
        </div>
      );
    case "photos":
      return (
        <div>
          <div className={label}>Photos</div>
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${box} aspect-square flex items-center justify-center`}>
                <ImageIcon className="w-3 h-3 opacity-60" />
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return <div className="text-xs text-mutedink">Ready to publish.</div>;
  }
}

function ReviewChecklist() {
  const items = [
    "All [PLACEHOLDERS] in the description replaced with real specs",
    "Photos uploaded in the order that matches your alt text",
    "Price, quantity, and shipping profile set on Etsy",
    "Renewal option chosen (automatic renews recommended)",
    'Personalization set correctly if you offer it',
    "No use of protected words (handmade / vintage) unless truly applicable",
  ];
  return (
    <div>
      <p className="text-sm text-subink mb-4">
        One last honest pass before you publish. ListingCraft filled the SEO — these are the human details.
      </p>
      <ul className="space-y-2">
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl border border-edge bg-white">
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 rounded border-edge text-teal focus:ring-teal"
              data-testid={`publish-review-${i}`}
            />
            <span className="text-sm text-ink">{t}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 rounded-xl bg-highlightCream border border-terracottaLight p-4 text-sm text-terracottaDark">
        Etsy tip: give the listing 30–60 minutes to appear in search. Refresh the listing tags once a month
        based on what's actually converting.
      </div>
    </div>
  );
}
