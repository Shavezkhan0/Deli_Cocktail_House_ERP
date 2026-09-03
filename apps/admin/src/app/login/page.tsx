"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { GlassWater, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { useAuth, type AuthUser } from "@/lib/auth";

type RequestOtpResponse = {
  message: string;
  email: string;
};

type VerifyOtpResponse = {
  token: string;
  user: AuthUser;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const requestOtp = useMutation({
    mutationFn: (value: string) =>
      apiFetch<RequestOtpResponse>("/api/auth/request-otp", {
        method: "POST",
        body: { email: value },
      }),
    onSuccess: () => {
      setOtpSent(true);
      setOtp("");
      toast.success(`OTP sent to ${email.trim()}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const verifyOtp = useMutation({
    mutationFn: (value: string) =>
      apiFetch<VerifyOtpResponse>("/api/auth/verify-otp", {
        method: "POST",
        body: { email: email.trim(), otp: value },
      }),
    onSuccess: (data) => {
      login(data.token, data.user);
      toast.success("Signed in successfully");
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message);
      setOtp("");
    },
  });

  function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();

    if (!EMAIL_PATTERN.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }

    requestOtp.mutate(trimmed);
  }

  function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }

    verifyOtp.mutate(otp);
  }

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-accent/20 to-muted/30">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-accent/20 to-muted/30 p-4">
      <Card className="w-full max-w-sm shadow-2xl shadow-primary/10 ring-1 ring-primary/20">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-primary/20">
            <GlassWater className="size-6" />
          </div>
          <CardTitle className="text-foreground text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            {otpSent
              ? `Enter the 6-digit code sent to ${email.trim()}`
              : "Sign in to the Deli Cocktail House catering ERP."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {otpSent ? (
            <form className="flex flex-col gap-4" onSubmit={handleVerifyOtp}>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="otp"
                  className="text-sm font-medium text-foreground"
                >
                  One-time password
                </label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="••••••"
                  className="text-center text-lg font-semibold tracking-[0.4em]"
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={verifyOtp.isPending}
              >
                {verifyOtp.isPending ? "Verifying…" : "Verify & Login"}
              </Button>

              <button
                type="button"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setOtpSent(false)}
                disabled={verifyOtp.isPending}
              >
                Use a different email
              </button>
            </form>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleRequestOtp}>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoFocus
                />
              </div>

              <Button type="submit" size="lg" disabled={requestOtp.isPending}>
                {requestOtp.isPending ? "Sending…" : "Send OTP"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
