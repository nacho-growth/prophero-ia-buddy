# PropHero IA Buddy — Project Rules

## Stack
- Next.js 14+ App Router, TypeScript strict mode, Tailwind CSS
- Supabase (PostgreSQL + Auth + Storage + Realtime + pgvector)
- Anthropic Claude API (claude-sonnet-4-20250514)
- Lucide React for ALL icons — no other icon library
- Zustand for client state, React Query for server state
- Zod for all input validation

## Non-negotiable rules
- NEVER hardcode company names, team names, user data, onboarding content, or agent personas — everything comes from the database
- EVERY query on a tenant-scoped table MUST include .eq('tenant_id', tenantId) — RLS is a backup, not a substitute
- Server components by default — add 'use client' only when strictly needed
- Data fetching in Server Components or API routes ONLY — never in useEffect
- All Claude API calls go through lib/ai/claude.ts — never call Anthropic SDK directly from routes or components
- After every AI response, save the assistant message to the messages table
- Any detected knowledge gap must be inserted into knowledge_gaps table
- Any XP awarded must be logged in xp_events table
- No `any` types — use `unknown` and narrow with type guards

## Supabase client usage
- Server components / API routes: createServerClient from @supabase/ssr
- Client components: createBrowserClient from @supabase/ssr
- Admin operations: createClient with service role key — server-side only, NEVER in client code

## API route pattern
Every API route must: (1) auth check, (2) zod validation, (3) delegate to lib/ function, (4) return response

## Folder ownership
- app/ → pages and layouts only, no logic
- lib/ai/ → all Claude API interaction, prompt building, embeddings
- lib/supabase/ → Supabase clients and typed query helpers
- lib/skills/ → skill loader and individual skill modules
- lib/scheduler/ → proactive message logic
- components/ → reusable UI only

## Error handling
- Never return raw errors to client
- Use Result type: type Result<T> = { ok: true; data: T } | { ok: false; error: string }
