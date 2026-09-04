import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const sections = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/competitions", label: "Competitions" },
  { to: "/admin/entries", label: "Entries" },
  { to: "/admin/payments", label: "Payments" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/faqs", label: "FAQs" },
  { to: "/admin/winners", label: "Winner" },
  { to: "/admin/audit-log", label: "Audit Log" },
];

export default function AdminLayout() {
  const { appUser, signOut } = useAuth();

  return (
    <div className="container-page py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">DriveMyDream Admin</p>
          <h1 className="mt-3 text-3xl">Dashboard</h1>
          <p className="mt-2 text-sm text-silver">Signed in as {appUser?.email ?? "administrator"}</p>
        </div>
        <button onClick={() => void signOut()} className="btn-secondary !px-4 !py-2 !text-xs">
          Sign Out
        </button>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]">
        <nav className="flex flex-row flex-wrap gap-2 md:flex-col md:gap-1">
          {sections.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              end={s.end}
              className={({ isActive }) =>
                `rounded-sm px-3 py-2 text-sm uppercase tracking-widest2 ${
                  isActive ? "bg-graphite text-bone" : "text-silver hover:text-bone"
                }`
              }
            >
              {s.label}
            </NavLink>
          ))}
        </nav>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
