import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { TEST_IDS } from "@/constants/listingIds";
import CopyButton from "@/components/CopyButton";
import ScoreRing from "@/components/ScoreRing";
import { toast } from "sonner";
import {
  Loader2, RotateCw, Upload, X, Sparkles, Check, Save,
  ChevronDown, ChevronUp,
} from "lucide-react";

const TONES = [
  { id: "warm",         label: "Warm / Handmade" },
  { id: "professional", label: "Professional" },
  { id: "playful",      label: "Playful" },
  { id: "luxury",       label: "Luxury" },
];

function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function Generator() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, refresh } = useAuth();

  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [buyer, setBuyer] = useState("");
  const [tone, setTone] = useState("warm");
  const [imageData, setImageData] = useState(null); // {b64, mime, preview}

  const [loading, setLoading] = useState(false);
  const [regenField, setRegenField] = useState(null);
  const [listing, setListing] = useState(null); // full server object
  const [showKeywords, setShowKeywords] = useState(true);

  useEffect(() => {
    if (id) {
      api.get(`/listings/${id}`).then((r) => {
        setListing(r.data);
        setDesc(r.data.input?.product_description || "");
        setCategory(r.data.input?.category || "");
        setPrice(r.data.input?.price_point || "");
        setBuyer(r.data.input?.target_buyer || "");
        setTone(r.data.tone || "warm");
      }).catch(() => toast.error("Listing not found"));
    }
  }, [id]);

  const onImage = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
      toast.error("PNG, JPG, or WEBP only");
      return;
    }
    const dataUrl = await readFileAsDataURL(f);
    setImageData({ b64: dataUrl, mime: f.type, preview: dataUrl });
  };

  const onGenerate = async (e) => {
    e?.preventDefault();
    if (!desc.trim() && !imageData) {
      toast.error("Add a description or upload a photo");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        product_description: desc,
        image_base64: imageData?.b64 || null,
        image_mime: imageData?.mime || null,
        category: category || null,
        price_point: price || null,
        target_buyer: buyer || null,
        tone,
      };
      const r = await api.post("/listings/generate", payload);
      setListing(r.data);
      navigate(`/generator/${r.data.listing_id}`, { replace: true });
      toast.success("Listing generated");
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const onRegen = async (field, length = null) => {
    if (!listing) return;
    setRegenField(field + (length ? `:${length}` : ""));
    try {
      const r = await api.post(`/listings/${listing.listing_id}/regenerate`, {
        field, tone, length,
      });
      setListing(r.data);
      toast.success(`${field} refreshed`);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Regeneration failed");
    } finally {
      setRegenField(null);
    }
  };

  const injectKeyword = (phrase) => {
    setDesc((d) => (d.includes(phrase) ? d : (d ? d + ", " : "") + phrase));
    toast.success(`Added "${phrase}" to description — regenerate to apply`);
  };

  const gen = listing?.generated;
  const score = listing?.score;

  const copyAll = () => {
    if (!gen) return;
    const parts = [
      `TITLE:\n${gen.title}`,
      `\n\nTAGS (paste one per tag slot):\n${gen.tags.join(", ")}`,
      `\n\nDESCRIPTION:\n${gen.description}`,
      `\n\nATTRIBUTES:\n${Object.entries(gen.attributes || {}).map(([k, v]) => `${k}: ${v}`).join("\n")}`,
      `\n\nALT TEXT (per photo):\n${(gen.alt_text || []).map((a, i) => `${i + 1}. ${a}`).join("\n")}`,
    ].join("");
    navigator.clipboard.writeText(parts);
    toast.success("Full listing copied in Etsy order");
  };

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl text-ink">Listing Generator</h1>
            <p className="text-subink text-sm mt-1">
              Give the AI a product. Get an Etsy-ready title, tags, and description.
            </p>
          </div>
          <div className="text-sm text-subink bg-white border border-edge rounded-full px-4 py-2">
            <span className="font-medium text-ink">{user?.generations_used_this_period || 0}</span>
            <span className="text-mutedink"> / {user?.limits?.monthly_generations ?? "∞"} used this month</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* INPUTS */}
          <section className="lg:col-span-5 bg-white rounded-2xl border border-edge p-6 lg:p-8 h-fit sticky lg:top-24">
            <div className="mb-5">
              <label className="text-sm text-ink font-medium">Describe your product</label>
              <textarea
                rows={5}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="e.g. Ocean sunset painting, acrylic on canvas 16x20, warm oranges & teal, coastal wall art"
                data-testid={TEST_IDS.genDescription}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-edge bg-white focus:outline-none focus:ring-2 focus:ring-terracotta focus:bg-highlightCream/60 transition-colors duration-200 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="text-xs text-subink">Category</label>
                <input
                  type="text" value={category} onChange={(e) => setCategory(e.target.value)}
                  placeholder="Wall Art"
                  data-testid={TEST_IDS.genCategory}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-edge bg-white focus:outline-none focus:ring-2 focus:ring-terracotta"
                />
              </div>
              <div>
                <label className="text-xs text-subink">Price point</label>
                <input
                  type="text" value={price} onChange={(e) => setPrice(e.target.value)}
                  placeholder="$45"
                  data-testid={TEST_IDS.genPrice}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-edge bg-white focus:outline-none focus:ring-2 focus:ring-terracotta"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs text-subink">Target buyer / occasion</label>
              <input
                type="text" value={buyer} onChange={(e) => setBuyer(e.target.value)}
                placeholder="Housewarming gift, coastal home decor"
                data-testid={TEST_IDS.genBuyer}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-edge bg-white focus:outline-none focus:ring-2 focus:ring-terracotta"
              />
            </div>

            <div className="mb-5">
              <label className="text-sm text-ink font-medium block mb-2">Tone</label>
              <div className="grid grid-cols-2 gap-2" data-testid={TEST_IDS.genTone}>
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id)}
                    className={`px-3 py-2 rounded-full text-xs border transition-colors duration-200 ${
                      tone === t.id
                        ? "bg-terracotta text-white border-terracotta"
                        : "bg-white text-ink border-edge hover:bg-surfaceCream"
                    }`}
                    data-testid={`tone-${t.id}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-sm text-ink font-medium block mb-2">Product photo (optional)</label>
              {imageData ? (
                <div className="relative rounded-xl overflow-hidden border border-edge">
                  <img src={imageData.preview} alt="preview" className="w-full h-40 object-cover" />
                  <button
                    onClick={() => setImageData(null)}
                    className="absolute top-2 right-2 bg-white/90 rounded-full p-1 hover:bg-white transition-colors duration-200"
                    title="Remove image"
                  >
                    <X className="w-4 h-4 text-ink" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-edge rounded-xl p-6 hover:bg-surfaceCream/60 transition-colors duration-200">
                  <Upload className="w-5 h-5 text-mutedink" />
                  <div className="text-sm text-subink">Upload PNG / JPG / WEBP</div>
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onImage} data-testid={TEST_IDS.genImage} />
                </label>
              )}
            </div>

            <button
              type="button"
              onClick={onGenerate}
              disabled={loading}
              data-testid={TEST_IDS.genSubmit}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-terracotta hover:bg-terracottaDark text-white transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate listing</>}
            </button>
            <p className="text-xs text-mutedink mt-3 text-center">
              Uses 1 generation from your monthly quota.
            </p>
          </section>

          {/* OUTPUT */}
          <section className="lg:col-span-7 space-y-6">
            {!listing && !loading && (
              <div className="bg-white rounded-2xl border border-edge border-dashed p-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-highlightCream flex items-center justify-center text-terracotta mb-4">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-2xl text-ink">Your Etsy listing lands here.</h3>
                <p className="text-subink text-sm mt-2 max-w-md mx-auto">
                  Fill in the left side and hit Generate. Every field will have its own copy button
                  and a regenerate control.
                </p>
              </div>
            )}

            {loading && !listing && (
              <div className="bg-white rounded-2xl border border-edge p-8 animate-pulse space-y-4">
                <div className="h-4 bg-surfaceCream rounded w-1/3" />
                <div className="h-8 bg-surfaceCream rounded" />
                <div className="h-4 bg-surfaceCream rounded w-1/4" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 13 }).map((_, i) => (
                    <div key={i} className="h-6 w-24 bg-surfaceCream rounded-full" />
                  ))}
                </div>
                <div className="h-4 bg-surfaceCream rounded w-1/4" />
                <div className="h-32 bg-surfaceCream rounded" />
              </div>
            )}

            {listing && gen && (
              <>
                {/* Score card */}
                <div className="bg-white rounded-2xl border border-edge p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
                  <ScoreRing score={score?.total || 0} testId={TEST_IDS.outScore} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="font-serif text-xl text-ink">Listing Score</h3>
                      <button
                        onClick={copyAll}
                        data-testid={TEST_IDS.copyAll}
                        className="text-xs px-3 py-1.5 rounded-full bg-teal text-white hover:bg-tealDark transition-colors duration-200"
                      >
                        Copy All (Etsy order)
                      </button>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                      {(score?.checks || []).map((c) => (
                        <li key={c.label} className="flex items-start gap-2">
                          <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white flex-shrink-0 ${c.passed ? "bg-teal" : "bg-mutedink"}`}>
                            <Check className="w-3 h-3" />
                          </span>
                          <span className="text-subink">
                            {c.label} <span className="text-mutedink text-xs">— {c.detail}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Title */}
                <FieldCard
                  label={`Title (${(gen.title || "").length}/140)`}
                  testId={TEST_IDS.outTitle}
                  onRegen={() => onRegen("title")}
                  onRegenShorter={() => onRegen("title", "shorter")}
                  onRegenLonger={() => onRegen("title", "longer")}
                  regenBusy={regenField?.startsWith("title")}
                  copyText={gen.title}
                  copyTestId={TEST_IDS.copyTitle}
                  regenTestId={TEST_IDS.regenTitle}
                >
                  <div className="text-ink leading-snug">{gen.title}</div>
                </FieldCard>

                {/* Tags */}
                <FieldCard
                  label={`Tags (${gen.tags.length}/13)`}
                  testId={TEST_IDS.outTags}
                  onRegen={() => onRegen("tags")}
                  regenBusy={regenField === "tags"}
                  copyText={gen.tags.join(", ")}
                  copyTestId={TEST_IDS.copyTags}
                  regenTestId={TEST_IDS.regenTags}
                >
                  <div className="flex flex-wrap gap-2">
                    {gen.tags.map((t, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-tealLight/60 text-teal border border-tealLight">
                        {t} <span className="text-mutedink">·{t.length}</span>
                      </span>
                    ))}
                  </div>
                </FieldCard>

                {/* Description */}
                <FieldCard
                  label={`Description (${(gen.description || "").length} chars)`}
                  testId={TEST_IDS.outDescription}
                  onRegen={() => onRegen("description")}
                  onRegenShorter={() => onRegen("description", "shorter")}
                  onRegenLonger={() => onRegen("description", "longer")}
                  regenBusy={regenField?.startsWith("description")}
                  copyText={gen.description}
                  copyTestId={TEST_IDS.copyDescription}
                  regenTestId={TEST_IDS.regenDescription}
                >
                  <pre className="whitespace-pre-wrap font-sans text-sm text-subink leading-relaxed">
                    {gen.description}
                  </pre>
                </FieldCard>

                {/* Attributes */}
                <FieldCard
                  label="Attributes"
                  onRegen={() => onRegen("attributes")}
                  regenBusy={regenField === "attributes"}
                  copyText={Object.entries(gen.attributes || {}).map(([k, v]) => `${k}: ${v}`).join("\n")}
                >
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {Object.entries(gen.attributes || {}).map(([k, v]) => (
                      <li key={k} className="flex items-center gap-2">
                        <span className="text-mutedink capitalize w-24">{k.replace("_", " ")}</span>
                        <span className="text-ink">{v || <span className="text-mutedink italic">—</span>}</span>
                      </li>
                    ))}
                  </ul>
                </FieldCard>

                {/* Alt text */}
                <FieldCard
                  label={`Photo alt text (${(gen.alt_text || []).length})`}
                  onRegen={() => onRegen("alt_text")}
                  regenBusy={regenField === "alt_text"}
                  copyText={(gen.alt_text || []).map((a, i) => `${i + 1}. ${a}`).join("\n")}
                >
                  <ol className="text-sm text-subink space-y-1.5 list-decimal ml-4">
                    {(gen.alt_text || []).map((a, i) => (<li key={i}>{a}</li>))}
                  </ol>
                </FieldCard>

                {/* Keywords */}
                <div className="bg-white rounded-2xl border border-edge">
                  <button
                    className="w-full flex items-center justify-between p-6"
                    onClick={() => setShowKeywords((s) => !s)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-serif text-xl text-ink">Keyword ideas</span>
                      <span className="text-xs text-mutedink">{(gen.keywords || []).length} phrases</span>
                    </div>
                    {showKeywords ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showKeywords && (
                    <div className="px-6 pb-6 space-y-2">
                      {(gen.keywords || []).map((k, i) => (
                        <button
                          key={i}
                          onClick={() => injectKeyword(k.phrase)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-edge bg-white hover:bg-surfaceCream transition-colors duration-200 text-left"
                        >
                          <span className="text-sm text-ink">{k.phrase}</span>
                          <span className="flex items-center gap-2">
                            <span className="w-16 h-1.5 bg-surfaceCream rounded-full overflow-hidden">
                              <span className="block h-full bg-terracotta rounded-full" style={{ width: `${k.relevance}%` }} />
                            </span>
                            <span className="text-xs text-mutedink w-8 text-right">{k.relevance}</span>
                          </span>
                        </button>
                      ))}
                      <button
                        onClick={() => onRegen("keywords")}
                        className="w-full mt-2 px-4 py-2 rounded-full text-xs border border-edge hover:bg-surfaceCream transition-colors duration-200"
                      >
                        {regenField === "keywords" ? "Refreshing…" : "Refresh keyword ideas"}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function FieldCard({ label, children, onRegen, onRegenShorter, onRegenLonger, regenBusy, copyText, testId, copyTestId, regenTestId }) {
  return (
    <div className="bg-white rounded-2xl border border-edge p-6 lg:p-8" data-testid={testId}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-serif text-xl text-ink">{label}</h3>
        <div className="flex items-center gap-2">
          {onRegenShorter && (
            <button
              onClick={onRegenShorter}
              disabled={regenBusy}
              className="text-xs px-3 py-1.5 rounded-full border border-edge bg-white hover:bg-surfaceCream text-ink transition-colors duration-200 disabled:opacity-60"
            >
              Shorter
            </button>
          )}
          {onRegenLonger && (
            <button
              onClick={onRegenLonger}
              disabled={regenBusy}
              className="text-xs px-3 py-1.5 rounded-full border border-edge bg-white hover:bg-surfaceCream text-ink transition-colors duration-200 disabled:opacity-60"
            >
              Longer
            </button>
          )}
          {onRegen && (
            <button
              onClick={onRegen}
              disabled={regenBusy}
              data-testid={regenTestId}
              className="text-xs px-3 py-1.5 rounded-full border border-edge bg-white hover:bg-surfaceCream text-ink transition-colors duration-200 inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {regenBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
              Regenerate
            </button>
          )}
          {copyText !== undefined && (
            <CopyButton text={copyText} testId={copyTestId} label="Copy" />
          )}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
