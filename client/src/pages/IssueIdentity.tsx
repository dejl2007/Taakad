import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navbar } from "@/components/Navbar";
import { CyberInput } from "@/components/CyberInput";
import { useRegisterIdentity } from "@/hooks/use-identities";
import { registerIdentitySchema } from "@shared/schema";
import { User, Calendar, CreditCard, Shield, QrCode } from "lucide-react";
import { motion } from "framer-motion";

type RegisterForm = z.infer<typeof registerIdentitySchema>;

export default function IssueIdentity() {
  const { mutate, isPending } = useRegisterIdentity();
  const [successDisplayId, setSuccessDisplayId] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If user already registered an identity in this browser, redirect to generate page
    const registered = typeof localStorage !== 'undefined' ? localStorage.getItem('taakad_registered_identity') : null;
    if (registered === 'true') {
      setLocation('/generate');
    }
  }, [setLocation]);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerIdentitySchema),
    defaultValues: {
      fullName: "",
      age: 18,
      passportId: "",
      expiryDate: "",
      verificationCode: "",
    }
  });

  const onSubmit = (data: RegisterForm) => {
    // Schema with z.coerce.number() ensures age is properly converted
    mutate(data, {
      onSuccess: (res) => {
        // server now returns a displayId string and optional minor flag
        setSuccessDisplayId((res as any).displayId || String(res.id).padStart(6,'0'));
        form.reset();
        // mark locally that identity was registered so we don't prompt again
        try { localStorage.setItem('taakad_registered_identity', 'true'); } catch (e) {}
        // redirect user to generate code page after a short pause so they
        // briefly see the success confirmation. Also provide immediate
        // navigation via button below.
        setTimeout(() => setLocation('/generate'), 1200);
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <div className="w-full max-w-lg">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="text-3xl font-display font-bold mb-2">Issue Digital Identity</h1>
            <p className="text-muted-foreground">Register your credentials on the Taakad secure network.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-8"
          >
            {successDisplayId ? (
              <div className="text-center py-8 space-y-6">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                  <Shield className="w-10 h-10 text-green-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Identity Issued!</h3>
                  <p className="text-muted-foreground">Your credentials have been hashed, encrypted, and stored securely.</p>
                </div>
                <div className="p-4 bg-black/40 rounded-lg border border-dashed border-white/20">
                  <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Identity Reference ID</p>
                  <p className="text-xl font-mono text-primary font-bold">#{successDisplayId}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSuccessDisplayId(null)}
                    className="py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                  >
                    Register Another
                  </button>
                  <button
                    onClick={() => setLocation('/generate')}
                    className="py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
                  >
                    Go to Generate Code
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <CyberInput
                  label="Full Name"
                  placeholder="JOHN DOE"
                  icon={<User className="w-4 h-4" />}
                  error={form.formState.errors.fullName?.message}
                  {...form.register("fullName")}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <CyberInput
                    label="Age"
                    type="number"
                    placeholder="25"
                    icon={<Calendar className="w-4 h-4" />}
                    error={form.formState.errors.age?.message}
                    {...form.register("age", { valueAsNumber: true })}
                  />
                  
                  <CyberInput
                    label="Verification Code"
                    placeholder="XYZ-123"
                    icon={<QrCode className="w-4 h-4" />}
                    error={form.formState.errors.verificationCode?.message}
                    {...form.register("verificationCode")}
                  />
                </div>

                <CyberInput
                  label="Passport ID"
                  placeholder="A12345678"
                  icon={<CreditCard className="w-4 h-4" />}
                  error={form.formState.errors.passportId?.message}
                  {...form.register("passportId")}
                />

                <CyberInput
                  label="Passport Expiry"
                  type="date"
                  icon={<Calendar className="w-4 h-4" />}
                  error={form.formState.errors.expiryDate?.message}
                  {...form.register("expiryDate")}
                />

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-4 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-primary/25 relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isPending ? "Encrypting & Storing..." : "Securely Register Identity"}
                      {!isPending && <Shield className="w-4 h-4" />}
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
