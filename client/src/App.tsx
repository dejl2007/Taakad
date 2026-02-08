import { useState, useEffect, createContext, useContext } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthPage } from "@/pages/Auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import IssueIdentity from "@/pages/IssueIdentity";
import VerifyIdentity from "@/pages/VerifyIdentity";
import GenerateCode from "@/pages/GenerateCode";

interface AuthState {
  isAuthenticated: boolean;
  userId: number | null;
  email: string | null;
}

interface AuthContextType {
  auth: AuthState;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

function Router({ isAuthenticated, onAuthSuccess }: { isAuthenticated: boolean; onAuthSuccess: (userId: number, email: string) => void }) {
  return (
    <Switch>
      <Route path="/landing" component={Landing} />
      <Route path="/auth">
        {() => <AuthPage onAuthSuccess={onAuthSuccess} />}
      </Route>
      {isAuthenticated ? (
        <>
          <Route path="/" component={Home} />
          <Route path="/issue" component={IssueIdentity} />
          <Route path="/generate" component={GenerateCode} />
          <Route path="/verify" component={VerifyIdentity} />
        </>
      ) : (
        <>
          <Route path="/" component={Landing} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    email: null,
  });
  const [, setLocation] = useLocation();

  // Check if user is already authenticated from localStorage
  useEffect(() => {
    const savedAuth = localStorage.getItem("authState");
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        setAuth(parsed);
      } catch (error) {
        console.error("Failed to parse saved auth state", error);
        localStorage.removeItem("authState");
      }
    }
  }, []);

  const handleAuthSuccess = (userId: number, email: string) => {
    const newAuthState: AuthState = {
      isAuthenticated: true,
      userId,
      email,
    };
    setAuth(newAuthState);
    localStorage.setItem("authState", JSON.stringify(newAuthState));
    // Redirect to home page
    setTimeout(() => setLocation("/"), 0);
  };

  const handleLogout = () => {
    setAuth({
      isAuthenticated: false,
      userId: null,
      email: null,
    });
    localStorage.removeItem("authState");
    setLocation("/");
  };

  return (
    <AuthContext.Provider value={{ auth, logout: handleLogout }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router isAuthenticated={auth.isAuthenticated} onAuthSuccess={handleAuthSuccess} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

export default App;
