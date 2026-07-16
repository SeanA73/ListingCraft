import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-edge bg-cream mt-24">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-full bg-terracotta flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="font-serif text-xl text-ink">ListingCraft</span>
          </div>
          <p className="text-sm text-subink max-w-xs">
            Etsy listings that rank and convert. Built for makers, not agencies.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-ink mb-3">Product</h4>
          <ul className="space-y-2 text-sm text-subink">
            <li><Link to="/pricing" className="hover:text-terracotta transition-colors duration-200">Pricing</Link></li>
            <li><Link to="/register" className="hover:text-terracotta transition-colors duration-200">Sign up</Link></li>
            <li><Link to="/login" className="hover:text-terracotta transition-colors duration-200">Log in</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium text-ink mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-subink">
            <li><Link to="/terms" className="hover:text-terracotta transition-colors duration-200">Terms</Link></li>
            <li><Link to="/privacy" className="hover:text-terracotta transition-colors duration-200">Privacy</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium text-ink mb-3">Roadmap</h4>
          <ul className="space-y-2 text-sm text-subink">
            <li>Direct publishing to Etsy — planned</li>
            <li>Bulk mode — Pro</li>
            <li>CSV / Vela export — Pro</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-edge py-6 text-center text-xs text-mutedink">
        © {new Date().getFullYear()} ListingCraft. Not affiliated with Etsy, Inc.
      </div>
    </footer>
  );
}
