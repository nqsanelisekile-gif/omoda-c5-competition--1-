import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const links = [
  { to: "/", label: "Home" },
  { to: "/competition", label: "Competition" },
  { to: "/#how-it-works", label: "How It Works" },
  { to: "/winner", label: "Winner" },
  { to: "/faq", label: "FAQ" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar() {
  const { firebaseUser } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-steel/60 bg-ink/90 backdrop-blur">
      <nav className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="font-display text-lg uppercase tracking-widest2">
          Drive<span className="text-ignition">My</span>Dream
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `text-[10px] uppercase tracking-widest2 transition-colors hover:text-bone ${
                  isActive ? "text-bone" : "text-silver"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          {firebaseUser ? (
            <>
              <Link to="/account" className="text-[10px] uppercase tracking-widest2 text-silver hover:text-bone">
                My Account
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="text-[10px] uppercase tracking-widest2 text-silver hover:text-bone">
                Log In
              </Link>
            </>
          )}
          <Link to="/enter" className="btn-primary !px-5 !py-2.5 !text-xs">
            Enter Now
          </Link>
        </div>

        <button
          className="md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="block h-0.5 w-6 bg-bone" />
          <span className="mt-1.5 block h-0.5 w-6 bg-bone" />
          <span className="mt-1.5 block h-0.5 w-6 bg-bone" />
        </button>
      </nav>

      {open && (
        <div className="border-t border-steel/60 bg-ink md:hidden">
          <div className="container-page flex flex-col gap-4 py-6">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-[10px] uppercase tracking-widest2 text-silver">
                {l.label}
              </NavLink>
            ))}
            {firebaseUser ? (
              <>
                <Link to="/account" onClick={() => setOpen(false)} className="text-[10px] uppercase tracking-widest2 text-silver">
                  My Account
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="text-[10px] uppercase tracking-widest2 text-silver">
                  Log In
                </Link>
              </>
            )}
            <Link to="/enter" onClick={() => setOpen(false)} className="btn-primary w-full">
              Enter Now — R100
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
