import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { TEST_IDS } from "@/constants/listingIds";
import { Search, Copy, Trash2, Files } from "lucide-react";

export default function Library() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/listings", { params: q ? { q } : {} });
      setItems(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, []);
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q]);

  const duplicate = async (id) => {
    try {
      await api.post(`/listings/${id}/duplicate`);
      toast.success("Duplicated");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this listing?")) return;
    try {
      await api.delete(`/listings/${id}`);
      toast.success("Deleted");
      setItems((xs) => xs.filter((x) => x.listing_id !== id));
    } catch (e) {
      toast.error("Failed");
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-mutedink uppercase tracking-widest">Library</p>
            <h1 className="font-serif text-3xl sm:text-4xl text-ink mt-1">Your saved listings</h1>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-mutedink absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search titles & descriptions…"
              data-testid={TEST_IDS.librarySearch}
              className="pl-9 pr-4 py-2.5 w-72 max-w-full rounded-full border border-edge bg-white focus:outline-none focus:ring-2 focus:ring-terracotta"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-subink text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-edge border-dashed bg-white p-14 text-center">
            <p className="text-subink">No listings yet.</p>
            <Link to="/generator" className="inline-block mt-4 px-5 py-2.5 rounded-full bg-terracotta text-white hover:bg-terracottaDark transition-colors duration-200">
              Generate your first
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((l) => (
              <div key={l.listing_id} className="rounded-2xl bg-white border border-edge p-5 flex flex-col" data-testid={TEST_IDS.libraryItem(l.listing_id)}>
                <div className="text-xs text-mutedink mb-1">{new Date(l.created_at).toLocaleDateString()}</div>
                <Link to={`/generator/${l.listing_id}`} className="text-ink font-medium hover:text-terracotta line-clamp-2 transition-colors duration-200">
                  {l.generated?.title || "Untitled"}
                </Link>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-tealLight/60 text-teal">Score {l.score?.total || 0}</span>
                  <span className="text-mutedink">{l.generated?.tags?.length || 0} tags · {(l.generated?.description || "").length} chars</span>
                </div>
                <div className="mt-4 pt-4 border-t border-edge flex items-center gap-2">
                  <button
                    onClick={() => {
                      const g = l.generated;
                      const t = [
                        `TITLE:\n${g.title}`,
                        `\n\nTAGS:\n${(g.tags || []).join(", ")}`,
                        `\n\nDESCRIPTION:\n${g.description}`,
                      ].join("");
                      navigator.clipboard.writeText(t);
                      toast.success("Copied");
                    }}
                    className="text-xs px-3 py-1.5 rounded-full border border-edge hover:bg-surfaceCream transition-colors duration-200 inline-flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                  <button
                    onClick={() => duplicate(l.listing_id)}
                    className="text-xs px-3 py-1.5 rounded-full border border-edge hover:bg-surfaceCream transition-colors duration-200 inline-flex items-center gap-1.5"
                  >
                    <Files className="w-3.5 h-3.5" /> Duplicate
                  </button>
                  <button
                    onClick={() => remove(l.listing_id)}
                    className="ml-auto text-xs p-1.5 rounded-full border border-edge hover:bg-surfaceCream text-terracotta transition-colors duration-200"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
