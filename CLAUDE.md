# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev        # http://localhost:5173 — UI only; Netlify function won't work
npm run build      # production build → dist/

# To test the Netlify function locally (RFQ generate/preview):
netlify dev        # proxies /.netlify/functions/* automatically
```

> The `/.netlify/functions/generate-rfq` endpoint is needed for "Generate RFQ ↓" and "👁 View" preview. Without `netlify dev`, these two features will fail locally — everything else works with `npm run dev`.

## Architecture

**Everything is in one file: `src/App.jsx` (~960 lines).** No routing, no component files — all components are top-level functions defined in that file.

**Supabase** is accessed via raw `fetch()` calls to the PostgREST REST API (no Supabase SDK). The `db` object at the top of `App.jsx` wraps all queries. Auth is not used — only the anon key.

**DOCX generation** happens entirely in `netlify/functions/generate-rfq.js`, a CommonJS Netlify function. The Word template is embedded as a giant base64 string inside that file. The function does XML string manipulation (not a proper docx library) to replace template placeholders. It receives `{ form, items }` and returns `{ filename, contentB64 }`.

**In-browser preview** uses `docx-preview` (dynamically imported) to render the generated DOCX blob directly in the browser. The preview re-calls the Netlify function on the fly using stored RFQ record data.

## Key Design Patterns

**Win95 design system** — all styling is inline React styles. The `W` object at the top of `App.jsx` holds the core constants (`W.bg`, `W.raised`, `W.sunken`). Helper functions `btn()`, `inp()`, `sel()` return style objects with sensible defaults that can be overridden by spreading extras. Never add a CSS framework or CSS files — keep it inline Win95.

**Supabase `db` object** — use this for all DB access, never add the Supabase SDK:
```js
db.suppliers.list()
db.suppliers.insert(row)
db.suppliers.update(id, row)
db.suppliers.delete(id)
db.projects.list() / insert() / update() / delete()
db.rfq.list() / insert() / updateStatus(record, newStatus)
```
`updateStatus` appends to `status_history` (jsonb array) automatically.

**Status flow** — `STATUS_META` drives RFQ status transitions: Draft → Issued → Closed, with reversion supported (Issued → Draft, Closed → Issued). Each `RFQRow` reads `STATUS_META[record.status]` to know what buttons to show.

## Supabase Tables

| Table | Key fields |
|---|---|
| `suppliers` | id, name, email, phone, address, location, category, specialties, last_verified, tcc_reference, tcc_issue_date, website, notes, contact_name, contact_position, contact_mobiles |
| `projects` | id, name, description, location, status (Active/On Hold/Completed) |
| `rfq_records` | id, brbn, project (name string), doc_date, scope, closing_time, closing_date, items (jsonb), supplier_ids (jsonb), supplier_names (jsonb), recipients_notes, status (Draft/Issued/Closed), status_history (jsonb) |

## DOCX Template Placeholders

Placeholders in the embedded template: `{{PROJECT}}`, `{{BRBN}}`, `{{DATE}}`, `{{SCOPE_OF_WORKS}}`, `{{CLOSING_TIME}}`, `{{CLOSING_DATE}}`. Items loop: `{#items}` … `{/items}` with `{{ITEM_NO}}`, `{{DESCRIPTION}}`, `{{QTY}}`, `{{UNIT}}`, `{{RATE}}`, `{{VIP_RATE}}`, `{{COMMENTS}}`. Both `footer1.xml` and `footer2.xml` also contain `{{BRBN}}`, `{{PROJECT}}`, `{{DATE}}`.

The `lastTag()` helper in the Netlify function is critical — it finds the *last* occurrence of an exact XML tag (e.g. `<w:p>`) to avoid matching `<w:pPr>` etc., which caused truncation bugs.

## Dev Workflow

- All changes go on the `dev` branch. Test locally.
- When ready to deploy: say **merge** — this pushes `dev` → `main` and Netlify auto-deploys.
- Never commit directly to `main`.

## Credentials

```
Supabase URL:  https://boxiezoqibfczozevxzu.supabase.co
GitHub repo:   github.com/Bulinalulu/mpw-supplier-directory
```
