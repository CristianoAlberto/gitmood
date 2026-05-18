# GitMood

GitMood é um webapp que analisa o humor de um dev com base nos commits públicos do GitHub.

O usuário informa um username, o app busca eventos públicos do GitHub, filtra `PushEvent`, extrai mensagens de commit e envia esse contexto para uma IA. O resultado é apresentado em um dashboard escuro com mood, evidências, gráfico de pontuação por dia e uma recomendação em tom de coach amigável.

## Stack

- Next.js 15 com App Router
- TypeScript estrito
- Tailwind CSS v4
- Recharts
- Framer Motion
- API pública do GitHub, sem token
- Groq via SDK oficial da OpenAI, usando endpoint compatível
- pnpm

## Como foi desenvolvido

O projeto foi construído do zero seguindo uma arquitetura simples e tipada:

- `app/actions/fetch-commits.ts` busca eventos públicos em `api.github.com/users/USERNAME/events/public`, filtra `PushEvent` e retorna commits tipados.
- `app/actions/analyze-mood.ts` recebe os commits e chama a IA usando structured outputs com `response_format: json_schema`.
- `lib/types.ts` centraliza os tipos compartilhados entre server actions e UI.
- `app/components/gitmood-app.tsx` concentra a experiência interativa: formulário, loading com skeleton e dashboard.
- `lib/logger.ts` existe para evitar `console.log` no projeto.

A UI segue uma identidade escura com `zinc-950`, cards `zinc-900`, bordas `zinc-800` e accent `violet-500`.

## Sobre a IA que ajudou no desenvolvimento

Este projeto foi desenvolvido com apoio de um assistente de IA operando como coding agent dentro do ambiente local. A IA ajudou a criar a estrutura inicial, configurar Next.js, TypeScript, Tailwind, server actions, integração com GitHub, integração com Groq/OpenAI-compatible API e a interface final.

O papel da IA foi acelerar a implementação mantendo as convenções definidas para o projeto: código tipado, sem `any`, sem `console.log`, componentes organizados e foco em uma experiência visual limpa.

## Rodando localmente

Instale as dependências:

```bash
pnpm install
```

Crie um arquivo `.env` baseado no `.env.example`:

```env
GROQ_API_KEY=sua_chave_do_groq
GROQ_MODEL=openai/gpt-oss-120b
```

Rode o servidor de desenvolvimento:

```bash
pnpm dev
```

Abra:

```txt
http://localhost:3000
```

## Observações

A API pública do GitHub sem token tem limite baixo de requisições. Se o limite for atingido, o app mostra uma mensagem clara informando quando tentar novamente.
