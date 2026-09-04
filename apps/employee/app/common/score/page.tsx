"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardPen, Star } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ErrorState, EmptyState, LoadingCards } from "@/components/common/states";
import { apiFetch } from "@/lib/api";

type WeeklyScore = {
  id: string;
  weekStart: string;
  score: number;
  notes: string | null;
};

function weekLabel(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function ScoreRing({ score }: { score: number }) {
  const size = 168;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 10);

  return (
    <div className="relative mx-auto size-[168px]">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#score-gradient)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-black tracking-tight text-white">
          {score}
          <span className="text-lg font-semibold text-white/60"> / 10</span>
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/60">
          This Week
        </p>
      </div>
    </div>
  );
}

function ScoreChart({ history }: { history: WeeklyScore[] }) {
  const ordered = [...history].reverse();

  return (
    <div className="flex items-end justify-between gap-3">
      {ordered.map((score) => (
        <div key={score.id} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-xs font-bold text-violet-300">{score.score}</span>
          <div
            className="w-full rounded-t-xl bg-gradient-to-t from-indigo-500 to-violet-500 shadow-lg shadow-violet-500/20"
            style={{ height: `${Math.max((score.score / 10) * 120, 12)}px` }}
          />
          <span className="text-[10px] font-medium text-white/60">
            {weekLabel(score.weekStart)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ScorePage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["score"],
    queryFn: async () => {
      const [current, history] = await Promise.all([
        apiFetch<WeeklyScore | null>("/api/employee/score/current"),
        apiFetch<WeeklyScore[]>("/api/employee/score/history"),
      ]);
      return { current, history };
    },
  });

  let content: React.ReactNode;

  if (isPending) {
    content = <LoadingCards count={2} />;
  } else if (isError) {
    content = <ErrorState message="Could not load your score" onRetry={refetch} />;
  } else if (data) {
    content = (
      <>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>This Week</CardTitle>
              <CardDescription>Score for the current week</CardDescription>
            </CardHeader>
            <div className="mt-6 flex flex-1 items-center justify-center">
              {data.current ? (
                <ScoreRing score={data.current.score} />
              ) : (
                <EmptyState
                  message="No score yet for this week"
                  sub="Your manager hasn't published a score yet."
                />
              )}
            </div>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Score History</CardTitle>
              <CardDescription>Last 4 weeks</CardDescription>
            </CardHeader>
            <div className="mt-6 flex flex-1 flex-col justify-center">
              {data.history.length > 0 ? (
                <div className="pt-2">
                  <ScoreChart history={data.history} />
                </div>
              ) : (
                <EmptyState
                  message="No scores recorded yet"
                  sub="Weekly scores will appear here as they are published."
                />
              )}
            </div>
          </Card>
        </div>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Manager Notes</CardTitle>
            <CardDescription>Feedback for this week</CardDescription>
          </CardHeader>
          <textarea
            readOnly
            rows={4}
            value={data.current?.notes ?? "No notes for this week."}
            className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-relaxed text-white/90 outline-none"
          />
        </Card>
      </>
    );
  }

  return (
    <AppShell
      title="My Score"
      subtitle="Weekly performance scores set by your manager."
      icon={<Star className="size-5" />}
    >
      {content}
    </AppShell>
  );
}
