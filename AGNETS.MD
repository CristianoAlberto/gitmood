# GitMood

Webapp que analisa o humor do dev baseado nos commits do GitHub.

## Stack obrigatoria

- Next.js 15 com app router
- TypeScript estrito
- Tailwind CSS v4
- recharts para graficos
- API publica do GitHub (sem token)
- IA via API da OpenAI, colocar key no .env

## Convencoes

- Componentes em /app/components
- Server actions em /app/actions
- Tipos compartilhados em /lib/types.ts
- Sem console.log, usar /lib/logger.ts
- Sem any, sem comentarios obvios
- UI escura, paleta zinc + accent roxo

## Fluxo

1. Usuario digita username
2. Server action busca commits via api.github.com/users/USERNAME/events/public
3. IA analisa as mensagens e devolve JSON estruturado
4. Frontend renderiza dashboard
