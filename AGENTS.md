<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- The app is a mobile-first, RTL Persian (fa) web app framed at max-width 430px in `__root.tsx`; Android delivery is via the web manifest (installable) — keep every screen phone-sized.
- Business numbers and rules (rates, coverage, meter tolerance, channel conflicts) live only in `src/lib/eco-calc.ts` and are covered by `src/lib/eco-calc.test.ts`; screens must import them, never hard-code them.
- Number display always goes through `src/lib/fa.ts` (manual Persian formatting) so SSR and client output match.
- Cross-screen user state lives in `src/lib/eco-store.tsx` (React context persisted to localStorage); there is no backend yet.
- Shared screen building blocks (header, yellow panel, rows, pills, bottom nav, sheets, charts) are in `src/components/eco/`; reuse them for new screens.
- AI bill reading: `src/lib/bill-ai.functions.ts` (server function) → `src/lib/ai-gateway.server.ts` (Lovable AI Gateway, Responses API, streamed structured output); deterministic bill rules live in `src/lib/bill-checks.ts` with tests, and the model's own findings are merged on top — never trust the model alone for consistency checks.
- Funnel analytics events are called inline with `window.__lovableEvents?.track?.("project.*", …)` at the success branch of the existing handler, and registered in `.lovable/events.json`.
