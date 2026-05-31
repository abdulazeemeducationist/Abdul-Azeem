import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  UserCog,
  LogOut,
  GraduationCap,
  ChevronRight,
} from "lucide-react";
import { clearAuth, getAuth } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Programs", icon: BookOpen },
  { href: "/students", label: "Students", icon: Users },
  { href: "/staff", label: "Staff", icon: UserCog },
];

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const auth = getAuth();

  function handleLogout() {
    clearAuth();
    setLocation("/login");
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar text-sidebar-foreground shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary">
          <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none text-sidebar-foreground">MCQ Admin</p>
          <p className="text-xs text-sidebar-foreground/50 mt-0.5">Content Management</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = location === href || location.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              data-testid={`nav-${label.toLowerCase()}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-4 border-t border-sidebar-border pt-3">
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-sidebar-primary-foreground">
              {auth?.user?.name?.[0]?.toUpperCase() ?? "A"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{auth?.user?.name ?? "Admin"}</p>
            <p className="text-xs text-sidebar-foreground/40 truncate">{auth?.user?.email}</p>
          </div>
        </div>
        <button
          data-testid="button-logout"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
