import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full glass-card p-8 rounded-2xl text-center space-y-6">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto border border-destructive/20">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold">Page Not Found</h1>
          <p className="text-muted-foreground">
            The encrypted path you are looking for does not exist or has been moved.
          </p>
        </div>

        <Link href="/">
          <button className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium border border-white/10 transition-colors">
            Return to Safety
          </button>
        </Link>
      </div>
    </div>
  );
}
