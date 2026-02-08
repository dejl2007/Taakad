import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AuthStep = "credentials" | "2fa";

interface AuthState {
  step: AuthStep;
  mode: "signup" | "login";
  email: string;
  password: string;
  confirmPassword: string;
  twoFACode: string;
  totpSecret?: string;
  otpauth?: string;
  error: string;
  loading: boolean;
  successMessage: string;
}

export function AuthPage({ onAuthSuccess }: { onAuthSuccess: (userId: number, email: string) => void }) {
  const [state, setState] = useState<AuthState>({
    step: "credentials",
    mode: "signup",
    email: "",
    password: "",
    confirmPassword: "",
    twoFACode: "",
    error: "",
    loading: false,
    successMessage: "",
  });

  const [resetVisible, setResetVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ ...state, error: "", loading: true });

    try {
      const endpoint =
        state.mode === "signup" ? "/api/auth/signup" : "/api/auth/login";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.email,
          password: state.password,
          ...(state.mode === "signup" && {
            confirmPassword: state.confirmPassword,
          }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setState({
          ...state,
          error: data.message || "Authentication failed",
          loading: false,
        });
        return;
      }

      setState({
        ...state,
        step: "2fa",
        error: "",
        loading: false,
        successMessage: data.message,
        otpauth: (data as any).otpauth,
      });
    } catch (error) {
      setState({
        ...state,
        error: "Network error. Please try again.",
        loading: false,
      });
    }
  };

  const handleTwoFASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ ...state, error: "", loading: true });

    try {
      const response = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.email,
          code: state.twoFACode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setState({
          ...state,
          error: data.message || "2FA verification failed",
          loading: false,
        });
        return;
      }

      // Authentication successful!
      // Save JWT token returned by server for authenticated requests
      if (data.token) {
        try {
          localStorage.setItem("taakad_token", data.token);
        } catch (err) {
          // ignore storage errors
        }
      }

      onAuthSuccess(data.userId, data.email);
    } catch (error) {
      setState({
        ...state,
        error: "Network error. Please try again.",
        loading: false,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">
            {state.step === "credentials" ? "Authentication" : "Verify 2FA"}
          </CardTitle>
          <CardDescription>
            {state.step === "credentials"
              ? "Secure access to Taakad Identity Verifier"
              : "Enter the code sent to your email"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Error Alert */}
          {state.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {state.successMessage && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                ✅ {state.successMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Credentials Step */}
          {state.step === "credentials" && (
            <div>
              <Tabs
                value={state.mode}
                onValueChange={(value) =>
                  setState({
                    ...state,
                    mode: value as "signup" | "login",
                    error: "",
                    successMessage: "",
                  })
                }
                className="mb-6"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  <TabsTrigger value="login">Login</TabsTrigger>
                </TabsList>

                <TabsContent value="signup" className="mt-6">
                  <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={state.email}
                        onChange={(e) =>
                          setState({ ...state, email: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Min 8 characters"
                        value={state.password}
                        onChange={(e) =>
                          setState({ ...state, password: e.target.value })
                        }
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        • At least 8 characters
                        <br />• Use a mix of letters, numbers, and symbols
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Re-enter password"
                        value={state.confirmPassword}
                        onChange={(e) =>
                          setState({
                            ...state,
                            confirmPassword: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={state.loading}
                    >
                      {state.loading ? "Creating account..." : "Sign Up"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="login" className="mt-6">
                  <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email">Email Address</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={state.email}
                        onChange={(e) =>
                          setState({ ...state, email: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your password"
                        value={state.password}
                        onChange={(e) =>
                          setState({ ...state, password: e.target.value })
                        }
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={state.loading}
                    >
                      {state.loading ? "Signing in..." : "Sign In"}
                    </Button>

                    <div className="mt-2 text-center">
                      <button
                        type="button"
                        className="text-sm text-blue-500 underline"
                        onClick={() => {
                          setResetVisible((v) => !v);
                          setResetEmail(state.email || "");
                          setResetError("");
                          setResetSuccess("");
                        }}
                      >
                        Forgot password?
                      </button>
                    </div>
                  </form>

                  {resetVisible && (
                    <div className="mt-4 p-4 border rounded bg-slate-50">
                      {resetError && (
                        <Alert variant="destructive" className="mb-3">
                          <AlertDescription>{resetError}</AlertDescription>
                        </Alert>
                      )}
                      {resetSuccess && (
                        <Alert className="mb-3 bg-green-50 border-green-200">
                          <AlertDescription className="text-green-800">{resetSuccess}</AlertDescription>
                        </Alert>
                      )}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setResetError("");
                          setResetSuccess("");
                          setResetLoading(true);
                          try {
                            const res = await fetch("/api/auth/reset-password", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                email: resetEmail,
                                code: resetCode,
                                newPassword: resetNewPassword,
                                confirmPassword: resetConfirmPassword,
                              }),
                            });
                            const data = await res.json();
                            if (!res.ok) {
                              setResetError(data.message || "Failed to reset password");
                            } else {
                              setResetSuccess(data.message || "Password reset successfully");
                              setResetVisible(false);
                              setState({ ...state, password: "" });
                            }
                          } catch (err) {
                            setResetError("Network error. Please try again.");
                          } finally {
                            setResetLoading(false);
                          }
                        }}
                        className="space-y-3"
                      >
                        <div>
                          <Label htmlFor="reset-email" className="text-[#1E40AF] dark:text-[#93C5FD]">Email</Label>
                          <Input id="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
                        </div>
                        <div>
                          <Label htmlFor="reset-code" className="text-[#1E40AF] dark:text-[#93C5FD]">Authenticator Code</Label>
                          <Input id="reset-code" type="text" maxLength={8} value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))} placeholder="00000000" required />
                        </div>
                        <div>
                          <Label htmlFor="reset-new" className="text-[#1E40AF] dark:text-[#93C5FD]">New Password</Label>
                          <Input id="reset-new" type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} required />
                        </div>
                        <div>
                          <Label htmlFor="reset-confirm" className="text-[#1E40AF] dark:text-[#93C5FD]">Confirm Password</Label>
                          <Input id="reset-confirm" type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} required />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" className="flex-1" disabled={resetLoading}>{resetLoading ? "Resetting..." : "Reset Password"}</Button>
                          <Button type="button" variant="ghost" onClick={() => setResetVisible(false)}>Cancel</Button>
                        </div>
                      </form>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* 2FA Step */}
          {state.step === "2fa" && (
            <form onSubmit={handleTwoFASubmit} className="space-y-4">
              {state.otpauth ? (
                <div className="bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-100">
                  🔐 Use your authenticator app to generate an 8-digit code for <strong>{state.email}</strong>
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-100">
                  📧 An 8-digit code has been sent to <strong>{state.email}</strong>
                </div>
              )}

              {state.otpauth && (
                <div className="mt-2 p-3 border rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium">Authenticator setup</p>
                  <p className="text-xs text-gray-600">Scan the QR with your authenticator app</p>
                  <div className="mt-2 flex justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(state.otpauth)}&size=200x200`}
                      alt="Authenticator QR"
                      className="mx-auto block"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="2fa-code">Verification Code</Label>
                <Input
                  id="2fa-code"
                  type="text"
                  placeholder="00000000"
                  maxLength={8}
                  value={state.twoFACode}
                  onChange={(e) =>
                    setState({
                      ...state,
                      twoFACode: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  required
                  className="text-center text-2xl tracking-widest font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Enter the 8-digit code from your authenticator</p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={state.loading || state.twoFACode.length !== 8}
              >
                {state.loading ? "Verifying..." : "Verify & Continue"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() =>
                  setState({
                    ...state,
                    step: "credentials",
                    twoFACode: "",
                    error: "",
                  })
                }
              >
                Back
              </Button>
            </form>
          )}

          {/* Security Notice */}
          <div className="mt-6 pt-4 border-t text-xs text-gray-500">
            <p className="mb-2">🔒 <strong>Security Features:</strong></p>
            <ul className="space-y-1 ml-2">
              <li>✓ Passwords are hashed with bcrypt</li>
              <li>✓ 2FA verification via email</li>
              <li>✓ Sensitive data encrypted</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
