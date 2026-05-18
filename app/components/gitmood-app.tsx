"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { analyzeMood } from "@/app/actions/analyze-mood";
import { fetchCommits } from "@/app/actions/fetch-commits";
import type { MoodAnalysis } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

function DashboardSkeleton() {
  return (
    <motion.section
      {...fadeUp}
      className="mx-auto grid w-full max-w-5xl gap-5"
      aria-label="Analisando commits"
    >
      <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
        <div className="h-24 w-24 animate-pulse rounded-3xl bg-violet-500/20" />
        <div className="mt-8 h-10 w-3/4 animate-pulse rounded-full bg-zinc-800" />
        <div className="mt-4 h-5 w-40 animate-pulse rounded-full bg-violet-500/20" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="h-6 w-36 animate-pulse rounded-full bg-zinc-800" />
          <div className="mt-6 space-y-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-4 animate-pulse rounded-full bg-zinc-800" />
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="h-6 w-44 animate-pulse rounded-full bg-zinc-800" />
          <div className="mt-8 h-56 animate-pulse rounded-2xl bg-zinc-800/70" />
        </div>
      </div>
      <div className="rounded-3xl border border-violet-500/30 bg-violet-500/10 p-6">
        <div className="h-6 w-48 animate-pulse rounded-full bg-violet-500/20" />
        <div className="mt-5 h-20 animate-pulse rounded-2xl bg-zinc-800/80" />
      </div>
    </motion.section>
  );
}

type DashboardProps = {
  analysis: MoodAnalysis;
};

function Dashboard({ analysis }: DashboardProps) {
  return (
    <motion.section {...fadeUp} className="mx-auto grid w-full max-w-5xl gap-5">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl shadow-violet-950/20">
        <div className="text-7xl sm:text-8xl">{analysis.emoji}</div>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-3xl text-4xl font-black tracking-[-0.06em] text-zinc-100 sm:text-6xl">
            {analysis.headline}
          </h2>
          <span className="w-fit rounded-full border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-black uppercase tracking-[0.22em] text-violet-300">
            {analysis.mood.replaceAll("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.25fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-xl font-black tracking-[-0.04em] text-zinc-100">Evidências</h3>
          <ul className="mt-6 space-y-4">
            {analysis.evidencia.map((item) => (
              <li key={item} className="flex gap-3 text-sm font-semibold leading-6 text-zinc-300">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-xl font-black tracking-[-0.04em] text-zinc-100">Pontuação por dia</h3>
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analysis.pontuacaoPorDia} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <XAxis dataKey="data" tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "16px",
                    color: "#f4f4f5",
                  }}
                  labelStyle={{ color: "#c4b5fd", fontWeight: 800 }}
                />
                <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={4} dot={{ r: 4, fill: "#8b5cf6" }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-violet-500/30 bg-violet-500/10 p-6 shadow-2xl shadow-violet-950/20">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-violet-300">Recomendação</p>
        <p className="mt-4 text-lg font-bold leading-8 text-zinc-100">{analysis.recomendacao}</p>
      </div>
    </motion.section>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível analisar esse usuário agora.";
}

export function GitMoodApp() {
  const [username, setUsername] = useState("");
  const [analysis, setAnalysis] = useState<MoodAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setAnalysis(null);

    startTransition(async () => {
      try {
        const commits = await fetchCommits(username);
        const moodAnalysis = await analyzeMood(commits);
        setAnalysis(moodAnalysis);
      } catch (caughtError) {
        setError(getErrorMessage(caughtError));
      }
    });
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8 sm:py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <motion.section {...fadeUp} className="mx-auto w-full max-w-2xl text-center">
          <div className="mx-auto w-fit rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-violet-300">
            GitMood
          </div>
          <h1 className="mt-7 text-5xl font-black tracking-[-0.07em] text-zinc-100 sm:text-7xl">
            Seu GitHub entregou seu humor.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base font-semibold leading-7 text-zinc-400 sm:text-lg">
            Digite um username e deixe os commits públicos denunciarem o clima da sprint.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-3 shadow-2xl shadow-violet-950/20 sm:flex sm:gap-3">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              disabled={isPending}
              aria-label="Username do GitHub"
              className="w-full rounded-2xl bg-zinc-950 px-5 py-4 text-base font-bold text-zinc-100 outline-none ring-1 ring-zinc-800 transition focus:ring-2 focus:ring-violet-500 disabled:opacity-60"
              placeholder="badlogic"
            />
            <button
              type="submit"
              disabled={isPending}
              className="mt-3 w-full rounded-2xl bg-violet-500 px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0 sm:w-auto"
            >
              Analisar
            </button>
          </form>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
              {error}
            </p>
          ) : null}
        </motion.section>

        {isPending ? <DashboardSkeleton /> : null}
        {analysis && !isPending ? <Dashboard analysis={analysis} /> : null}
      </div>
    </main>
  );
}
