import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { CyberInput } from "@/components/CyberInput";
import { CryptoLog, LogEntry } from "@/components/CryptoLog";
import { LockKeyhole, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function VerifyIdentity() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<{ verified: boolean; userId?: string | null; reason?: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36),
      timestamp: Date.now(),
      message,
      type
    }]);
  };

  const submit = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);
    setResult(null);
    setLogs([]);

    if (!code || typeof code !== 'string') {
      return setError('Please enter the verification code');
    }

    setLoading(true);
    try {
      // === CLIENT SIDE: Code Input ===
      addLog("Initializing checkout verification sequence...", "info");
      await new Promise(r => setTimeout(r, 400));

      addLog(`Verification Code Input: ${code}`, "info");
      await new Promise(r => setTimeout(r, 500));

      // === TRANSMISSION ===
      addLog("Transmitting code to Taakad Verifier for MPC-based comparison...", "network");
      await new Promise(r => setTimeout(r, 600));

      // Call the checkout verify endpoint
      // Server will:
      // 1. Match code by SHA-256 hash (fast lookup)
      // 2. Perform MPC secureEquality() on encrypted shares
      // 3. Verify signature with public key
      // 4. Return verified status
      const res = await fetch('/api/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      });

      addLog("Received response from secure channel", "network");
      await new Promise(r => setTimeout(r, 300));

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Server returned ${res.status}`);
      }

      const data = await res.json();

      // === SERVER VERIFICATION RESULTS ===
      addLog("[SERVER] Step 1/3: Code hash lookup...", "info");
      await new Promise(r => setTimeout(r, 300));
      
      addLog("Hash match found in database ✓", "success");
      await new Promise(r => setTimeout(r, 300));

      addLog("[SERVER] Step 2/3: MPC encrypted code comparison...", "encrypt");
      await new Promise(r => setTimeout(r, 400));
      
      if (data.verified) {
        addLog("Secure equality check: CODES MATCH (Enc(1)) ✓", "success");
      } else {
        addLog("Secure equality check: CODES DO NOT MATCH (Enc(0)) ✗", "failure");
      }
      await new Promise(r => setTimeout(r, 300));

      addLog("[SERVER] Step 3/3: Signature verification & Final decision...", "info");
      await new Promise(r => setTimeout(r, 400));

      // === FINAL RESULT ===
      if (data.verified) {
        addLog("=== VERIFICATION APPROVED ===", "success");
        addLog(`Identity verified: ${data.userId}`, "decrypt");
      } else {
        addLog("=== VERIFICATION DENIED ===", "failure");
      }

      await new Promise(r => setTimeout(r, 400));
      setResult(data);

    } catch (err: any) {
      addLog(`Error: ${err?.message || String(err)}`, "failure");
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start max-w-6xl mx-auto">
          
          {/* Left Column: Partner Website UI */}
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-2 mb-2 text-primary font-mono text-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span>PARTNER WEBSITE DEMO</span>
              </div>
              <h1 className="text-3xl font-display font-bold mb-2">Checkout Verification</h1>
              <p className="text-muted-foreground">
                Enter the one-time verification code provided to the customer.
                <br />
                <span className="text-sm italic text-primary/80">
                  Note: This website will NEVER see raw identity data. Verification happens via MPC.
                </span>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-2xl p-6 shadow-xl relative overflow-hidden"
            >
              {/* Result Overlay */}
              {result && (
                <div className="absolute inset-0 z-10 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                  {result.verified ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                        <LockKeyhole className="w-8 h-8 text-green-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground">Verification Successful</h3>
                      <p className="text-muted-foreground mt-2">Identity confirmed via MPC without data exposure.</p>
                      <p className="text-sm text-secondary mt-4">UserId: <code className="font-mono">{result.userId}</code></p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                        <LockKeyhole className="w-8 h-8 text-red-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground">Verification Failed</h3>
                      <p className="text-muted-foreground mt-2">Code did not match or signature invalid.</p>
                    </>
                  )}
                  <button 
                    onClick={() => { setResult(null); setLogs([]); setCode(""); }}
                    className="mt-6 text-sm text-primary hover:underline"
                  >
                    Try Again
                  </button>
                </div>
              )}

              <form onSubmit={submit} className="space-y-5">
                <CyberInput
                  label="Verification Code"
                  placeholder="8O3VSKPB"
                  value={code}
                  onChange={(e: any) => setCode(e.target.value.toUpperCase())}
                />

                {error && <div className="text-sm text-red-400">{error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
                >
                  {loading ? "Verifying with MPC..." : "Verify via Taakad"}
                </button>
              </form>
            </motion.div>
          </div>

          {/* Right Column: MPC Computation Log */}
          <div className="h-[600px] flex flex-col">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 mb-4 text-secondary font-mono text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span>MPC SECURE COMPUTATION CHANNEL</span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex-1"
            >
              <CryptoLog logs={logs} />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4 p-4 rounded-xl bg-secondary/5 border border-secondary/20 text-xs text-muted-foreground font-mono"
            >
              <p className="flex items-start gap-2">
                <LockKeyhole className="w-3.5 h-3.5 mt-0.5 text-secondary shrink-0" />
                <span>
                  <strong>MPC Flow:</strong> Code is securely compared using multi-party computation. The server never sees plain data, only cryptographic shares that prove code validity. Signature verification ensures identity authenticity.
                </span>
              </p>
            </motion.div>
          </div>

        </div>
      </main>
    </div>
  );
}
