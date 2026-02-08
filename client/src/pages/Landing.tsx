import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ArrowRight, Shield, Zap, Lock, Eye, Database } from 'lucide-react';
import TextReveal from '@/components/TextReveal';
import { Button } from '@/components/ui/button';
import '@fontsource/rakkas';

function shortHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return (h >>> 0).toString(16).slice(0, 8);
}

function Carousel() {
  const slides = [
    { icon: <Shield size={48} />, title: 'Zero Trust', desc: 'Cryptographically impossible for any single party to access your private data.' },
    { icon: <Lock size={48} />, title: 'Military Grade', desc: "Shamir's Secret Sharing + AES-256-GCM encryption + HMAC-SHA256 signing." },
    { icon: <Zap size={48} />, title: 'Lightning Fast', desc: 'Distributed across Vercel & Cloudflare. Sub-second verification times.' },
    { icon: <Eye size={48} />, title: 'Privacy First', desc: 'No tracking, no data selling. Only you control your identity.' },
    { icon: <Database size={48} />, title: 'Verifiable', desc: 'Zero-knowledge proofs let you prove facts without revealing secrets.' },
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-center mb-6">
        <div className="w-full">
          <TextReveal text={shortHash(slides[index].title)} revealText={slides[index].title} className="mx-auto" />
          <p className="text-center text-slate-400 mt-4">{slides[index].desc}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          aria-label="previous"
          onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
          className="p-3 rounded-full bg-white/5 hover:bg-white/10"
        >
          ‹
        </button>
        <div className="flex items-center gap-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-3 h-3 rounded-full ${i === index ? 'bg-indigo-400' : 'bg-white/20'}`}
            />
          ))}
        </div>
        <button
          aria-label="next"
          onClick={() => setIndex((i) => (i + 1) % slides.length)}
          className="p-3 rounded-full bg-white/5 hover:bg-white/10"
        >
          ›
        </button>
      </div>
    </div>
  );
}

export default function Landing() {
  const [isLoading, setIsLoading] = useState(true);
  const [showLogo, setShowLogo] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Show animation for 4 seconds, then show logo for 1 second
    const animationTimer = setTimeout(() => {
      setShowLogo(true);
    }, 4000);

    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => {
      clearTimeout(animationTimer);
      clearTimeout(loadingTimer);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="text-center">
          {!showLogo ? (
            // Lottie Animation Preloader
            <div className="w-full max-w-2xl h-auto mx-auto">
              <DotLottieReact
                src="https://lottie.host/5a62d7d0-355a-4dfc-9e0e-d4cba06a53e3/7aRe2JGNc1.lottie"
                loop
                autoplay
              />
            </div>
          ) : (
            // Launch Logo at 200% with transition
            <div className="animate-fade-in">
              <img
                src="/launch-logo.png"
                alt="Taakad"
                style={{ width: '150px', height: 'auto', transform: 'scale(3.25)' }}
                className="mx-auto transition-transform duration-700 ease-out"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="px-6 py-4 flex justify-between items-center backdrop-blur-md bg-black/40 sticky top-0 z-50 border-b border-indigo-500/20">
        <a href="/" className="flex items-center">
          <img src="/navbar-logo.png" alt="Taakad Home" className="h-10 w-auto" />
        </a>
        <div className="hidden md:flex gap-8 items-center">
          <a href="#features" className="hover:text-indigo-400 transition font-medium">Features</a>
          <a href="#security" className="hover:text-indigo-400 transition font-medium">Security</a>
          <a href="#how" className="hover:text-indigo-400 transition font-medium">How It Works</a>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg" onClick={() => setLocation('/auth')}>Sign In</Button>
      </nav>

      {/* Hero Section - Animated */}
      <section className="relative px-6 py-32 max-w-7xl mx-auto overflow-hidden">
        {/* Background animated elements */}
        <div className="absolute top-0 right-10 w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-blue-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="grid md:grid-cols-2 gap-16 items-center relative z-10">
          {/* Left: Text content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-6xl md:text-7xl font-black leading-tight text-center" style={{fontFamily: 'Rakkas, serif'}}>
                Your Identity.
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">No Compromise.</span>
              </h1>
              <p className="text-xl text-slate-300 leading-relaxed">
                The world's first identity verification system powered by Multi-Party Computation. Your data is split across secure servers. No single entity can access it alone.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 px-8 text-lg rounded-xl flex items-center gap-2 transition transform hover:scale-105" onClick={() => setLocation('/auth')}>
                Get Started <ArrowRight size={20} />
              </Button>
              <Button className="border-2 border-indigo-500 hover:border-indigo-400 text-indigo-300 hover:text-indigo-200 font-bold py-6 px-8 text-lg rounded-xl transition" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                Learn More
              </Button>
            </div>

            {/* Trust badge */}
            <div className="flex items-center gap-2 text-sm text-slate-400 pt-4">
              <Shield size={16} className="text-green-400" />
              <span>Enterprise-grade security • Global infrastructure • Zero-knowledge proof</span>
            </div>
          </div>

          {/* Right: Animated Lottie graphic */}
          <div className="relative flex items-center justify-center group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl blur-2xl opacity-30 animate-pulse group-hover:opacity-50 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-l from-cyan-600 to-indigo-600 rounded-2xl blur-3xl opacity-0 group-hover:opacity-20 transition-opacity" />
            <div className="relative z-10 w-full flex justify-center transform group-hover:scale-105 transition-transform">
              <DotLottieReact
                src="https://lottie.host/59c523a8-7044-4e69-998f-a34b17fa20fa/cnulIDtwxc.lottie"
                loop
                autoplay
                style={{ width: '780px', height: '780px' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Carousel */}
      <section id="features" className="px-6 py-24 bg-gradient-to-b from-indigo-950/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            {/* Carousel container */}
          </div>

          <Carousel />
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="px-6 py-24 max-w-7xl mx-auto">
        <h2 className="text-5xl font-black mb-16 text-center" style={{fontFamily: 'Rakkas, serif'}}>How It Works</h2>
        
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { num: '01', title: 'Sign Up', desc: 'Create your account with email & 2FA', icon: <Shield size={40} /> },
            { num: '02', title: 'Register', desc: 'Submit identity documents securely', icon: <Zap size={40} /> },
            { num: '03', title: 'Split', desc: 'System splits data across 2 parties', icon: <Lock size={40} /> },
            { num: '04', title: 'Verify', desc: 'Generate zero-knowledge proofs', icon: <Eye size={40} /> },
          ].map((step, i) => (
            <div key={i} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-blue-600/20 rounded-xl blur-lg group-hover:blur-xl transition-all opacity-0 group-hover:opacity-100" />
              <div className="relative bg-gradient-to-br from-indigo-600/20 to-blue-600/20 border border-indigo-500/30 rounded-xl p-8 text-center hover:border-indigo-500/60 transition transform hover:scale-105">
                <div className="text-indigo-400 mb-4 flex justify-center group-hover:scale-125 transition-transform">
                  {step.icon}
                </div>
                <div className="text-4xl font-black text-indigo-400 mb-4">{step.num}</div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-slate-400">{step.desc}</p>
              </div>
              {i < 3 && <div className="absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-indigo-500 to-transparent hidden md:block group-hover:from-indigo-400 transition-colors" />}
            </div>
          ))}
        </div>
      </section>

      {/* Security Highlights */}
      <section id="security" className="px-6 py-24 bg-gradient-to-r from-indigo-950/50 to-slate-950 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-indigo-600/20 rounded-full filter blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-5xl font-black mb-12 text-center" style={{fontFamily: 'Rakkas, serif'}}>Enterprise Security</h2>
          
          <div className="bg-gradient-to-r from-indigo-900/40 to-blue-900/40 border border-indigo-500/40 rounded-2xl p-12 backdrop-blur-sm hover:border-indigo-500/60 transition-colors">
            <ul className="space-y-6 text-lg">
              {[
                'Shamir\'s Secret Sharing (k=2, n=2 threshold)',
                'AES-256-GCM encryption at rest',
                'HMAC-SHA256 request signing',
                'Timestamp replay protection (±2 minute window)',
                'Per-request nonce for additional security',
                'TOTP 2FA (authenticator-based, no SMS)',
                'Age verification (adults & minors tracked)',
                'Zero-knowledge proofs for verification',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-4 group">
                  <span className="w-2 h-2 bg-gradient-to-r from-indigo-400 to-blue-400 rounded-full mt-3 flex-shrink-0 group-hover:scale-150 transition-transform" />
                  <span className="group-hover:text-indigo-300 transition-colors">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-32 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 relative overflow-hidden group">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 right-10 w-40 h-40 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse" />
          <div className="absolute bottom-10 left-10 w-40 h-40 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl font-black mb-6 group-hover:scale-105 transition-transform" style={{fontFamily: 'Rakkas, serif'}}>Ready to Own Your Identity?</h2>
          <p className="text-xl mb-10 opacity-95">Join the identity revolution. No compromises. No backdoors. Just security.</p>
          <Button className="bg-white text-indigo-600 hover:bg-slate-100 font-black py-7 px-12 text-lg rounded-xl transition transform hover:scale-110 shadow-2xl hover:shadow-3xl" onClick={() => setLocation('/auth')}>
            Create Account Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-slate-800 text-slate-400 text-center">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center gap-8 mb-8">
            <a href="#" className="hover:text-indigo-400 transition">Privacy</a>
            <a href="#" className="hover:text-indigo-400 transition">Terms</a>
            <a href="#" className="hover:text-indigo-400 transition">Contact</a>
            <a href="#" className="hover:text-indigo-400 transition">GitHub</a>
          </div>
          <p>&copy; 2026 Taakad. Secure Digital Identity. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
