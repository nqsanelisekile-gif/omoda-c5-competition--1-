import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-steel/60 bg-graphite">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div>
          <p className="font-display text-lg uppercase tracking-widest2">
            Drive<span className="text-ignition">My</span>Dream
          </p>
          <p className="mt-3 max-w-xs text-sm text-silver">
            An independently run promotional competition. Not affiliated with OMODA
            South Africa unless stated in the official rules.
          </p>
        </div>

        <div>
          <p className="eyebrow mb-4">Competition</p>
          <ul className="space-y-2 text-sm text-silver">
            <li><Link to="/competition" className="hover:text-bone">How It Works</Link></li>
            <li><Link to="/enter" className="hover:text-bone">Enter Now</Link></li>
            <li><Link to="/winner" className="hover:text-bone">Winner</Link></li>
            <li><Link to="/faq" className="hover:text-bone">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-4">Legal</p>
          <ul className="space-y-2 text-sm text-silver">
            <li><Link to="/terms" className="hover:text-bone">Terms &amp; Conditions</Link></li>
            <li><Link to="/privacy" className="hover:text-bone">Privacy Policy (POPIA)</Link></li>
            <li><Link to="/contact" className="hover:text-bone">Contact Us</Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-4">Account</p>
          <ul className="space-y-2 text-sm text-silver">
            <li><Link to="/login" className="hover:text-bone">Log In</Link></li>
            <li><Link to="/account" className="hover:text-bone">My Account</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-steel/60 py-6">
        <p className="container-page text-xs text-silver">
          © {new Date().getFullYear()} DriveMyDream. All rights reserved. This competition
          is subject to the full Terms &amp; Conditions. Odds of winning depend on the total
          number of valid entries received.
        </p>
      </div>
    </footer>
  );
}
