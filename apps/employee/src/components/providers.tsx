"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth";
import { OfflineBanner } from "@/components/offline-banner";
import { ServerErrorOverlay } from "@/components/server-error-overlay";
import { useOnlineStatus } from "@/lib/use-online-status";

export function Providers({ children }: { children: ReactNode }) {
  const [serverUnreachable, setServerUnreachable] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const browserOnline = useOnlineStatus();

  // Trust the browser's online/offline signal as a starting point, but a real
  // successful request (see queryCache/mutationCache onSuccess below) always
  // wins — navigator.onLine can get stuck reporting false in some network
  // setups even while requests are actually succeeding.
  useEffect(() => {
    setIsOffline(!browserOnline);
  }, [browserOnline]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
        queryCache: new QueryCache({
          onError: (error) => {
            if (error instanceof TypeError) setServerUnreachable(true);
          },
          onSuccess: () => {
            setServerUnreachable(false);
            setIsOffline(false);
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (error instanceof TypeError) setServerUnreachable(true);
          },
          onSuccess: () => {
            setServerUnreachable(false);
            setIsOffline(false);
          },
        }),
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OfflineBanner isOffline={isOffline} />
        {!isOffline && serverUnreachable ? (
          <ServerErrorOverlay
            onRetry={() => {
              setServerUnreachable(false);
              queryClient.invalidateQueries();
            }}
          />
        ) : null}
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}