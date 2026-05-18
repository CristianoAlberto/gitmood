"use server";

import { analyzeMood } from "@/app/actions/analyze-mood";
import { fetchCommits } from "@/app/actions/fetch-commits";
import { logger } from "@/lib/logger";
import type { MoodAnalysis } from "@/lib/types";

type AnalyzeUsernameResult =
  | {
      ok: true;
      analysis: MoodAnalysis;
    }
  | {
      ok: false;
      error: string;
    };

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível analisar esse usuário agora.";
}

export async function analyzeUsername(username: string): Promise<AnalyzeUsernameResult> {
  try {
    const commits = await fetchCommits(username);
    const analysis = await analyzeMood(commits);

    return {
      ok: true,
      analysis,
    };
  } catch (error) {
    logger.error("GitMood analysis failed", {
      error: getSafeErrorMessage(error),
    });

    return {
      ok: false,
      error: getSafeErrorMessage(error),
    };
  }
}
