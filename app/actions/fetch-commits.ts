"use server";

import type { GitCommitMessage } from "@/lib/types";

const githubEventsBaseUrl = "https://api.github.com/users";
const maxCommits = 100;
const maxPages = 3;
const maxFallbackCommitRequests = 35;

const githubHeaders = {
  Accept: "application/vnd.github+json",
  "User-Agent": "GitMood",
  "X-GitHub-Api-Version": "2022-11-28",
};

function getRateLimitMessage(response: Response) {
  const resetHeader = response.headers.get("x-ratelimit-reset");
  const resetDate = resetHeader ? new Date(Number(resetHeader) * 1000) : null;

  if (!resetDate || Number.isNaN(resetDate.getTime())) {
    return "Limite da API pública do GitHub atingido. Tente novamente em alguns minutos.";
  }

  return `Limite da API pública do GitHub atingido. Tente novamente após ${resetDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}.`;
}

function isRateLimited(response: Response) {
  return response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0";
}

type GithubPushPayload = {
  commits?: unknown;
  before?: unknown;
  head?: unknown;
};

type GithubRepo = {
  url?: unknown;
};

type GithubEvent = {
  type?: unknown;
  createdAt?: unknown;
  payload?: GithubPushPayload;
  repo?: GithubRepo;
};

function normalizeUsername(username: string) {
  return username.trim();
}

function isValidUsername(username: string) {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseGithubEvents(value: unknown): GithubEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((event) => {
    const payload = isRecord(event.payload) ? event.payload : undefined;
    const repo = isRecord(event.repo) ? event.repo : undefined;

    return {
      type: event.type,
      createdAt: event.created_at,
      payload: payload
        ? {
            commits: payload.commits,
            before: payload.before,
            head: payload.head,
          }
        : undefined,
      repo: repo
        ? {
            url: repo.url,
          }
        : undefined,
    };
  });
}

function parseEventCommit(commit: unknown, timestamp: string): GitCommitMessage | null {
  if (!isRecord(commit)) {
    return null;
  }

  const author = isRecord(commit.author) ? commit.author : undefined;
  const name = typeof author?.name === "string" ? author.name : "Autor desconhecido";
  const email = typeof author?.email === "string" ? author.email : null;

  if (typeof commit.message !== "string" || typeof commit.sha !== "string") {
    return null;
  }

  return {
    sha: commit.sha,
    message: commit.message,
    timestamp,
    author: {
      name,
      email,
    },
  };
}

function parseRepositoryCommit(commit: unknown, fallbackTimestamp: string): GitCommitMessage | null {
  if (!isRecord(commit) || typeof commit.sha !== "string" || !isRecord(commit.commit)) {
    return null;
  }

  const details = commit.commit;
  const author = isRecord(details.author) ? details.author : undefined;

  if (typeof details.message !== "string") {
    return null;
  }

  return {
    sha: commit.sha,
    message: details.message,
    timestamp: typeof author?.date === "string" ? author.date : fallbackTimestamp,
    author: {
      name: typeof author?.name === "string" ? author.name : "Autor desconhecido",
      email: typeof author?.email === "string" ? author.email : null,
    },
  };
}

function extractInlinePushCommits(event: GithubEvent) {
  const commits: GitCommitMessage[] = [];

  if (typeof event.createdAt !== "string" || !Array.isArray(event.payload?.commits)) {
    return commits;
  }

  for (const commit of event.payload.commits) {
    const parsedCommit = parseEventCommit(commit, event.createdAt);

    if (parsedCommit) {
      commits.push(parsedCommit);
    }
  }

  return commits;
}

async function fetchHeadPushCommit(event: GithubEvent) {
  if (
    typeof event.createdAt !== "string" ||
    typeof event.repo?.url !== "string" ||
    typeof event.payload?.head !== "string"
  ) {
    return null;
  }

  const response = await fetch(`${event.repo.url}/commits/${event.payload.head}`, {
    headers: githubHeaders,
    next: {
      revalidate: 3600,
    },
  });

  if (isRateLimited(response)) {
    throw new Error(getRateLimitMessage(response));
  }

  if (!response.ok) {
    return null;
  }

  return parseRepositoryCommit(await response.json(), event.createdAt);
}

type FallbackBudget = {
  remaining: number;
};

async function extractPushCommits(events: GithubEvent[], remainingCommits: number, fallbackBudget: FallbackBudget) {
  const commits: GitCommitMessage[] = [];

  for (const event of events) {
    if (commits.length >= remainingCommits) {
      break;
    }

    if (event.type !== "PushEvent") {
      continue;
    }

    const inlineCommits = extractInlinePushCommits(event);

    if (inlineCommits.length > 0) {
      commits.push(...inlineCommits.slice(0, remainingCommits - commits.length));
      continue;
    }

    if (fallbackBudget.remaining <= 0) {
      continue;
    }

    fallbackBudget.remaining -= 1;
    const headCommit = await fetchHeadPushCommit(event);

    if (headCommit) {
      commits.push(headCommit);
    }
  }

  return commits;
}

export async function fetchCommits(username: string): Promise<GitCommitMessage[]> {
  const normalizedUsername = normalizeUsername(username);

  if (!isValidUsername(normalizedUsername)) {
    throw new Error("Username do GitHub inválido.");
  }

  const commits: GitCommitMessage[] = [];
  const fallbackBudget = { remaining: maxFallbackCommitRequests };

  for (let page = 1; page <= maxPages && commits.length < maxCommits; page += 1) {
    const response = await fetch(
      `${githubEventsBaseUrl}/${encodeURIComponent(normalizedUsername)}/events/public?per_page=100&page=${page}`,
      {
        headers: githubHeaders,
        next: {
          revalidate: 3600,
        },
      },
    );

    if (response.status === 404) {
      throw new Error("Usuário do GitHub não encontrado.");
    }

    if (isRateLimited(response)) {
      throw new Error(getRateLimitMessage(response));
    }

    if (!response.ok) {
      throw new Error(`Não foi possível buscar os eventos públicos do GitHub. Status ${response.status}.`);
    }

    const events = parseGithubEvents(await response.json());

    if (events.length === 0) {
      break;
    }

    commits.push(...(await extractPushCommits(events, maxCommits - commits.length, fallbackBudget)));
  }

  return commits.slice(0, maxCommits);
}
