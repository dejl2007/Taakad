import { Link, useLocation } from "wouter";
import { Activity, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/App";

export function Navbar() {
  const [location] = useLocation();
  const { auth, logout } = useAuth();

  const isActive = (path: string) => location === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 group">
          <img src="/navbar-logo.png" alt="Taakad Logo" className="h-10 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center space-x-1 bg-white/5 p-1 rounded-full border border-white/5">
          <NavLink href="/" active={isActive("/")}>Home</NavLink>
          <NavLink href="/issue" active={isActive("/issue")}>Issue Identity</NavLink>
          <NavLink href="/verify" active={isActive("/verify")}>Verify Demo</NavLink>
        </nav>

        <div className="flex items-center space-x-4">
          <div className="flex items-center text-xs text-muted-foreground font-mono gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
            <Activity className="w-3 h-3 text-green-500 animate-pulse" />
            <span>SYSTEM SECURE</span>
          </div>

          {auth.isAuthenticated && (
            <div className="flex items-center gap-3 pl-3 border-l border-white/5">
              <div className="text-sm text-muted-foreground">
                <p className="text-xs opacity-60">Logged in as</p>
                <p className="font-mono text-white text-xs">{auth.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="flex items-center gap-2 hover:text-red-400"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
        active 
          ? "bg-primary/20 text-primary shadow-[0_0_10px_-2px_hsl(var(--primary)/0.5)]" 
          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      )}
    >
      {children}
    </Link>
  );
}
