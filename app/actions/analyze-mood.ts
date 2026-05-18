"use server";

import OpenAI from "openai";
import type { GitCommitMessage, GitMood, MoodAnalysis } from "@/lib/types";

const model = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
const groqBaseUrl = "https://api.groq.com/openai/v1";

const moods = [
  "ESTRESSADO",
  "PRODUTIVO",
  "CONFUSO",
  "CELEBRANDO",
  "EM_CHAMAS",
  "DESCANSADO",
  "EM_DEBITO_TECNICO",
] as const satisfies readonly GitMood[];

const moodAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mood: {
      type: "string",
      enum: moods,
    },
    emoji: {
      type: "string",
      description: "Exatamente 1 emoji.",
    },
    headline: {
      type: "string",
      maxLength: 60,
      description: "Em português, provocativo.",
    },
    evidencia: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "string",
      },
    },
    recomendacao: {
      type: "string",
      description: "Um parágrafo, em português, com tom de coach amigável.",
    },
    pontuacaoPorDia: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          data: {
            type: "string",
            pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          },
          score: {
            type: "number",
            minimum: 0,
            maximum: 100,
          },
        },
        required: ["data", "score"],
      },
    },
  },
  required: ["mood", "emoji", "headline", "evidencia", "recomendacao", "pontuacaoPorDia"],
} as const;

function getAiClient() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY ausente. Adicione GROQ_API_KEY=sua_chave_do_groq no arquivo .env e reinicie o servidor.");
  }

  return new OpenAI({
    apiKey,
    baseURL: groqBaseUrl,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGitMood(value: unknown): value is GitMood {
  return typeof value === "string" && moods.includes(value as GitMood);
}

function isSingleEmoji(value: string) {
  return Array.from(value.trim()).length === 1;
}

function isDailyScore(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.data === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.data) &&
    typeof value.score === "number" &&
    value.score >= 0 &&
    value.score <= 100
  );
}

function parseMoodAnalysis(value: unknown): MoodAnalysis {
  if (!isRecord(value)) {
    throw new Error("A IA retornou uma resposta inválida.");
  }

  if (!isGitMood(value.mood)) {
    throw new Error("A IA retornou um mood inválido.");
  }

  if (typeof value.emoji !== "string" || !isSingleEmoji(value.emoji)) {
    throw new Error("A IA retornou um emoji inválido.");
  }

  if (typeof value.headline !== "string" || value.headline.length > 60) {
    throw new Error("A IA retornou uma headline inválida.");
  }

  if (
    !Array.isArray(value.evidencia) ||
    value.evidencia.length < 3 ||
    value.evidencia.length > 5 ||
    !value.evidencia.every((item) => typeof item === "string")
  ) {
    throw new Error("A IA retornou evidências inválidas.");
  }

  if (typeof value.recomendacao !== "string") {
    throw new Error("A IA retornou uma recomendação inválida.");
  }

  if (!Array.isArray(value.pontuacaoPorDia) || !value.pontuacaoPorDia.every(isDailyScore)) {
    throw new Error("A IA retornou pontuações por dia inválidas.");
  }

  return {
    mood: value.mood,
    emoji: value.emoji,
    headline: value.headline,
    evidencia: value.evidencia,
    recomendacao: value.recomendacao,
    pontuacaoPorDia: value.pontuacaoPorDia.map((item) => {
      const score = item as { data: string; score: number };

      return {
        data: score.data,
        score: score.score,
      };
    }),
  };
}

function buildPrompt(commits: GitCommitMessage[]) {
  const commitLines = commits.map((commit) => ({
    sha: commit.sha,
    mensagem: commit.message,
    timestamp: commit.timestamp,
    autor: commit.author,
  }));

  return `Analise o humor de um dev com base nos commits públicos abaixo.\n\nRegras:\n- Responda apenas no JSON do schema solicitado.\n- Use português brasileiro.\n- Seja provocativo, mas útil.\n- Não invente fatos fora das mensagens.\n- A pontuação por dia deve ir de 0 a 100, onde 0 é caos total e 100 é fluxo saudável.\n- Agrupe pontuacaoPorDia por data YYYY-MM-DD extraída dos timestamps.\n\nCommits:\n${JSON.stringify(commitLines, null, 2)}`;
}

export async function analyzeMood(commits: GitCommitMessage[]): Promise<MoodAnalysis> {
  if (commits.length === 0) {
    throw new Error("Nenhum commit disponível para análise.");
  }

  const client = getAiClient();

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: "Você é o GitMood, um analista sarcástico e preciso de humor de devs baseado em commits.",
      },
      {
        role: "user",
        content: buildPrompt(commits),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "gitmood_analysis",
        strict: true,
        schema: moodAnalysisSchema,
      },
    },
  });

  const content = completion.choices[0]?.message.content;

  if (!content) {
    throw new Error("A IA não retornou conteúdo para análise.");
  }

  return parseMoodAnalysis(JSON.parse(content) as unknown);
}
