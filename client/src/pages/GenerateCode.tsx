import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function GenerateCode() {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [identityId, setIdentityId] = useState<number | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    setCode(null);
    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('taakad_token') : null;
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/identities/generate-code', { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) {
        // If identity is not ready (not issued or not checked-in), redirect user to the Issue page
        if (res.status === 403) {
          toast({ title: 'Identity Required', description: 'You need to complete issuance — redirecting to Issue page...', variant: 'destructive' });
          window.location.href = '/issue';
          return;
        }
        toast({ title: 'Failed', description: data.message || 'Could not generate code', variant: 'destructive' });
      } else {
        setCode(data.code);
        setIdentityId(data.identityId ?? null);
        toast({ title: 'Code generated', description: 'Use this code for verification', variant: 'default' });
      }
    } catch (err) {
      toast({ title: 'Network error', description: 'Try again later', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-bold mb-2">Generate Verification Code</h1>
            <p className="text-sm text-muted-foreground mb-6">Click the button below to generate a one-time verification code.</p>

            {code ? (
              <div className="mb-4">
                <div className="text-xs text-muted-foreground">Your code</div>
                <div className="text-3xl font-mono font-bold mt-2">{code}</div>
                {identityId ? (
                  <div className="mt-2 text-xs text-muted-foreground">Associated Identity ID: <span className="font-mono font-semibold">{identityId}</span></div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-3">
              <Button onClick={handleGenerate} className="w-full" disabled={loading}>{loading ? 'Generating...' : 'Generate Code'}</Button>
              <Button variant="ghost" className="w-full" onClick={() => { setCode(null); }}>Clear</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
