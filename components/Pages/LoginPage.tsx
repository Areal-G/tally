"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AUTH_FORM_FIELD_SKY,
  AUTH_GOOGLE_BUTTON,
} from "@/components/auth/auth-glass-styles";
import {
  GLASS_BUTTON_ICON_HOVER,
  GLASS_PRIMARY_BUTTON,
} from "@/components/shared";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { setPostLoginWelcome } from "@/lib/auth/post-login-welcome";
import { AuthAnimatedBlock } from "@/components/auth/AuthAnimatedBlock";
import { LoginShowcase } from "@/components/auth/LoginShowcase";
import { TallyMark } from "@/components/brand/TallyMark";
import {
  AUTH_FORM_ROW_STAGGER_MS,
  AUTH_FORM_STAGGER_BASE,
} from "@/components/auth/auth-animation";
import { Loader2, Lock, Mail } from "lucide-react";

/**
 * Login page client component (uses useSearchParams for OAuth/redirect).
 * Split layout: brand showcase (lg+) and the sign-in column (email/password,
 * then Google).
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigatingToHome, setIsNavigatingToHome] = useState(false);
  const { login, isLoggedIn, user } = useAuth();

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const navigatingFromSubmitRef = useRef(false);

  useEffect(() => {
    if (isLoggedIn && !navigatingFromSubmitRef.current) {
      const dest =
        user?.role === "client"
          ? "/client"
          : user?.role === "supplier"
            ? "/supplier"
            : "/";
      window.location.href = dest;
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      let errorMessage = "An error occurred during Google sign-in.";

      switch (error) {
        case "oauth_not_configured":
          errorMessage =
            "Google OAuth is not configured. Please contact support.";
          break;
        case "oauth_failed":
          errorMessage =
            "Google sign-in was cancelled or failed. Please try again.";
          break;
        case "invalid_state":
          errorMessage = "Invalid OAuth state. Please try again.";
          break;
        case "no_code":
          errorMessage = "OAuth authorization code missing. Please try again.";
          break;
        case "token_exchange_failed":
          errorMessage = "Failed to exchange OAuth token. Please try again.";
          break;
        case "fetch_user_failed":
          errorMessage =
            "Failed to fetch user information from Google. Please try again.";
          break;
        case "no_email":
          errorMessage = "Google account email is required. Please try again.";
          break;
        case "oauth_processing_failed":
        case "oauth_error":
          errorMessage =
            "An error occurred during OAuth processing. Please try again.";
          break;
        default:
          errorMessage = `OAuth error: ${error}. Please try again.`;
      }

      toast({
        title: "Google Sign-In Failed",
        description: errorMessage,
        variant: "destructive",
      });

      router.replace("/login");
    }
  }, [searchParams, router, toast]);

  const handleGoogleSignIn = async () => {
    try {
      const redirectUrl = searchParams.get("redirect") || "/";
      const oauthUrl = `/api/auth/oauth/google?callback=${encodeURIComponent(
        redirectUrl,
      )}`;
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- API route that redirects to Google; needs a full navigation
      window.location.href = oauthUrl;
    } catch (error) {
      console.error("Error initiating Google OAuth:", error);
      toast({
        title: "OAuth Error",
        description: "Failed to initiate Google sign-in. Please try again.",
        variant: "destructive",
      });
    }
  };

  const signIn = async (loginEmail: string, loginPassword: string) => {
    setIsLoading(true);

    try {
      const userData = await login(loginEmail, loginPassword);
      const userName = userData.name || userData.email.split("@")[0] || "User";

      navigatingFromSubmitRef.current = true;
      setIsNavigatingToHome(true);

      setPostLoginWelcome({
        userName,
        role: userData.role ?? "user",
      });

      const dest =
        userData.role === "client"
          ? "/client"
          : userData.role === "supplier"
            ? "/supplier"
            : "/";
      window.location.href = dest;
    } catch (error: unknown) {
      const axiosErr = error as {
        response?: { data?: { error?: string }; status?: number };
      };
      const serverMessage = axiosErr?.response?.data?.error;
      toast({
        title: "Login Failed",
        description:
          serverMessage || "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (!navigatingFromSubmitRef.current) setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void signIn(email, password);
  };

  const formDisabled = isLoading || isNavigatingToHome;

  const formRowDelay = (row: number) =>
    AUTH_FORM_STAGGER_BASE + row * AUTH_FORM_ROW_STAGGER_MS;

  return (
    <div className="auth-page-root relative min-h-screen bg-[var(--bg-main)]">
      {/* Soft brand glows behind the sign-in column; decorative. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(60rem_40rem_at_100%_0%,var(--glow-1),transparent),radial-gradient(40rem_30rem_at_60%_100%,var(--glow-2),transparent)]"
      />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:p-5">
        <div className="hidden lg:block">
          <LoginShowcase />
        </div>

        <main className="flex items-center justify-center py-6 sm:py-10">
          <div className="w-full max-w-[420px]">
            {/* Brand for small screens (the showcase column is hidden below lg). */}
            <AuthAnimatedBlock delayMs={0} className="mb-8 lg:hidden">
              <Link
                href="/"
                className="inline-flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                aria-label="Tally — Inventory Management"
              >
                <span className="money-brand-fill money-brand-shadow flex size-10 items-center justify-center rounded-xl">
                  <TallyMark className="h-5 w-5" />
                </span>
                <span className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  Tally
                </span>
              </Link>
            </AuthAnimatedBlock>

            <AuthAnimatedBlock delayMs={formRowDelay(0)} className="mb-7 space-y-1.5">
              <h2 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                Welcome back
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Sign in to your Tally workspace.
              </p>
            </AuthAnimatedBlock>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AuthAnimatedBlock delayMs={formRowDelay(1)} className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-[var(--text-primary)]"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
                    aria-hidden
                  />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={formDisabled}
                    className={cn("h-11 w-full pl-9", AUTH_FORM_FIELD_SKY)}
                  />
                </div>
              </AuthAnimatedBlock>

              <AuthAnimatedBlock delayMs={formRowDelay(2)} className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-[var(--text-primary)]"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
                    aria-hidden
                  />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={formDisabled}
                    className={cn("h-11 w-full pl-9", AUTH_FORM_FIELD_SKY)}
                  />
                </div>
              </AuthAnimatedBlock>

              <AuthAnimatedBlock delayMs={formRowDelay(3)}>
                <Button
                  type="submit"
                  disabled={formDisabled}
                  className={cn(
                    GLASS_BUTTON_ICON_HOVER,
                    "h-11 w-full text-[15px]",
                    GLASS_PRIMARY_BUTTON.sky,
                  )}
                >
                  {isNavigatingToHome ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opening dashboard…
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </AuthAnimatedBlock>
            </form>

            <AuthAnimatedBlock
              delayMs={formRowDelay(4)}
              className="my-5 flex items-center gap-3"
            >
              <span className="h-px flex-1 bg-[var(--border-subtle)]" aria-hidden />
              <p className="text-xs font-medium text-[var(--text-secondary)]">or</p>
              <span className="h-px flex-1 bg-[var(--border-subtle)]" aria-hidden />
            </AuthAnimatedBlock>

            <AuthAnimatedBlock delayMs={formRowDelay(5)}>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={formDisabled}
                className={cn(AUTH_GOOGLE_BUTTON.login, "h-11")}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
            </AuthAnimatedBlock>

            <AuthAnimatedBlock
              delayMs={formRowDelay(6)}
              className="mt-8 text-center text-sm"
            >
              <p className="text-[var(--text-secondary)]">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
                >
                  Sign up
                </Link>
              </p>
            </AuthAnimatedBlock>
          </div>
        </main>
      </div>
    </div>
  );
}
