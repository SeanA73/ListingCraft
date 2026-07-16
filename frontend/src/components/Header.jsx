import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { TEST_IDS } from "@/constants/listingIds";
import { Sparkles, LogOut, User as UserIcon, LibraryBig, LayoutDashboard } from "lucide-react";

export default function Header({ compact = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const onLogout = async () => {
    await logout();
    navigate("/");
  };

  const isDashArea = ["/dashboard", "/generator", "/library", "/account"].some(p =>
    location.pathname.startsWith(p)
  );

  return (
    <header className="sticky top-0 z-40 bg-cream/80 backdrop-blur-md border-b border-edge">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 group" data-testid={TEST_IDS.navHome}>
          <span className="w-8 h-8 rounded-full bg-terracotta flex items-center justify-center text-white transition-transform duration-200 group-hover:-translate-y-0.5">
            <Sparkles className="w-4 h-4" />
          </span>
          <span className="font-serif text-xl text-ink">ListingCraft</span>
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          {!user && (
            <>
              <Link to="/pricing" className="px-4 py-2 text-sm text-subink hover:text-ink transition-colors duration-200 rounded-full" data-testid={TEST_IDS.navPricing}>
                Pricing
              </Link>
              <a href="#faq" className="px-4 py-2 text-sm text-subink hover:text-ink transition-colors duration-200 rounded-full">FAQ</a>
              <Link to="/login" className="px-4 py-2 text-sm text-ink hover:text-terracotta transition-colors duration-200 rounded-full" data-testid={TEST_IDS.navLogin}>
                Log in
              </Link>
              <Link to="/register" className="ml-2 px-5 py-2 text-sm bg-terracotta hover:bg-terracottaDark text-white rounded-full transition-colors duration-200" data-testid={TEST_IDS.navSignup}>
                Get started
              </Link>
            </>
          )}
          {user && (
            <>
              <Link to="/dashboard" className={`px-4 py-2 text-sm rounded-full transition-colors duration-200 flex items-center gap-2 ${location.pathname === "/dashboard" ? "text-terracotta" : "text-subink hover:text-ink"}`}>
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link to="/generator" className={`px-4 py-2 text-sm rounded-full transition-colors duration-200 flex items-center gap-2 ${location.pathname.startsWith("/generator") ? "text-terracotta" : "text-subink hover:text-ink"}`}>
                <Sparkles className="w-4 h-4" /> Generator
              </Link>
              <Link to="/library" className={`px-4 py-2 text-sm rounded-full transition-colors duration-200 flex items-center gap-2 ${location.pathname === "/library" ? "text-terracotta" : "text-subink hover:text-ink"}`}>
                <LibraryBig className="w-4 h-4" /> Library
              </Link>
              <Link to="/pricing" className="px-4 py-2 text-sm text-subink hover:text-ink transition-colors duration-200 rounded-full">Pricing</Link>
              <Link to="/account" className="ml-2 px-4 py-2 text-sm bg-surfaceCream hover:bg-highlightCream text-ink rounded-full flex items-center gap-2 transition-colors duration-200" data-testid={TEST_IDS.userMenu}>
                <UserIcon className="w-4 h-4" />
                <span className="max-w-[120px] truncate">{user.name || user.email}</span>
              </Link>
              <button onClick={onLogout} className="p-2 text-subink hover:text-terracotta transition-colors duration-200 rounded-full" title="Log out" data-testid={TEST_IDS.logoutBtn}>
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </nav>

        {/* mobile */}
        <div className="md:hidden flex items-center gap-2">
          {!user && (
            <Link to="/register" className="px-4 py-2 text-sm bg-terracotta text-white rounded-full">
              Start free
            </Link>
          )}
          {user && (
            <Link to="/generator" className="px-4 py-2 text-sm bg-terracotta text-white rounded-full">
              Generator
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
