export type MoodTone = "positive" | "neutral" | "negative";

export type GitCommitAuthor = {
  name: string;
  email: string | null;
};

export type GitCommitMessage = {
  sha: string;
  message: string;
  timestamp: string;
  author: GitCommitAuthor;
};

export type GitMood =
  | "ESTRESSADO"
  | "PRODUTIVO"
  | "CONFUSO"
  | "CELEBRANDO"
  | "EM_CHAMAS"
  | "DESCANSADO"
  | "EM_DEBITO_TECNICO";

export type DailyMoodScore = {
  data: string;
  score: number;
};

export type MoodAnalysis = {
  mood: GitMood;
  emoji: string;
  headline: string;
  evidencia: string[];
  recomendacao: string;
  pontuacaoPorDia: DailyMoodScore[];
};
