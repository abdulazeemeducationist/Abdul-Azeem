import { useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./Sidebar";
import { isAuthenticated } from "@/lib/auth";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated() && location !== "/login") {
      setLocation("/login");
    }
  }, [location, setLocation]);

  if (location === "/login") {
    return <>{children}</>;
  }

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
