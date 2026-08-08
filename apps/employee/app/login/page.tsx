"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { GlassWater } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useAuth, type EmployeeUser } from "@/lib/auth";

type RequestOtpResponse = {
  message: string;
  email: string;
};

type VerifyOtpResponse = {
  token: string;
  employee: EmployeeUser;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

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
      apiFetch<RequestOtpResponse>("/api/employee/request-otp", {
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
      apiFetch<VerifyOtpResponse>("/api/employee/verify-otp", {
        method: "POST",
        body: { email: email.trim(), otp: value },
      }),
    onSuccess: (data) => {
      login(data.token, data.employee);
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6 items-center text-center">
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GlassWater className="size-6" />
          </div>
          <h3 className="font-semibold leading-none tracking-tight text-xl">Welcome back</h3>
          <p className="text-sm text-muted-foreground mt-1.5">
            {otpSent
              ? `Enter the 6-digit code sent to ${email.trim()}`
              : "Sign in to the Deli Cocktail House employee portal."}
          </p>
        </div>

        <div className="p-6 pt-0">
          {otpSent ? (
            <form className="flex flex-col gap-4" onSubmit={handleVerifyOtp}>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="otp"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground"
                >
                  One-time password
                </label>
                <input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="••••••"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-center text-lg font-semibold tracking-[0.4em]"
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={verifyOtp.isPending}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
              >
                {verifyOtp.isPending ? "Verifying…" : "Verify & Login"}
              </button>

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
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  autoFocus
                />
              </div>

              <button 
                type="submit" 
                disabled={requestOtp.isPending}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
              >
                {requestOtp.isPending ? "Sending…" : "Send OTP"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
