import { Link } from "wouter";
import { ArrowRight, Shield, Globe, Lock, CheckCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 px-4 overflow-hidden">
          {/* Background Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          
          <div className="container mx-auto relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20 mb-6">
                  <Shield className="w-3 h-3" />
                  Next-Generation Privacy Protocol
                </span>
                <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight">
                  Verify Identities <br />
                  <span className="text-gradient">Without Revealing Data</span>
                </h1>
              </motion.div>
              
              <motion.p 
                className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Taakad uses advanced homomorphic encryption to verify user credentials. 
                Third-party websites can confirm who you are without ever seeing your private information.
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Link href="/issue">
                  <button className="w-full sm:w-auto px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-lg shadow-primary/25">
                    Issue Identity
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
                <Link href="/verify">
                  <button className="w-full sm:w-auto px-8 py-4 rounded-xl bg-card border border-white/10 hover:border-white/20 text-foreground font-semibold flex items-center justify-center gap-2 transition-all hover:bg-white/5 backdrop-blur-sm">
                    Try Demo Verification
                    <Globe className="w-5 h-5" />
                  </button>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-black/20 border-t border-white/5">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Lock className="w-8 h-8 text-secondary" />}
                title="Zero-Knowledge"
                description="Our servers verify encrypted data against encrypted records. We never see the raw inputs."
              />
              <FeatureCard 
                icon={<Globe className="w-8 h-8 text-primary" />}
                title="Universal Standard"
                description="Designed to be embedded in any website requiring KYC or identity verification."
              />
              <FeatureCard 
                icon={<CheckCircle className="w-8 h-8 text-green-400" />}
                title="Instant Verification"
                description="Get a boolean Yes/No response in milliseconds, preserving user privacy entirely."
              />
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-card/30 border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-card/50 group">
      <div className="mb-6 p-4 rounded-xl bg-background border border-white/5 w-fit group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="py-8 border-t border-white/5 bg-background">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Taakad Security Protocols. All rights reserved.</p>
      </div>
    </footer>
  );
}
