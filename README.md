# Nuzlocke Helper

Browser-based helper for Nuzlocke runs: build a team of 6, compare catches against your roster, preview evolution stat growth, analyze typings, and manage PC/death boxes.

All data stays in your browser (`localStorage`). Pokémon data is fetched live from [PokeAPI](https://pokeapi.co/).

## Features

### Run profiles

- **Multiple profiles** — create, switch, and delete run profiles (each with its own team, boxes, settings)
- **Official game profile** — pick a mainline game/version group for PokeAPI learnset/stat context
- **Hackrom profile** — pick base mechanics generation (e.g. Gen 3) + Pokémon scope (e.g. up to Gen 9 species)
- Stored under `nuzloke-helper-profiles-v2` (migrates legacy `nuzloke-helper-team-v1` automatically)

### Team & boxes

- **Team builder** — 6 slots with per-Pokémon **+1 level** button
- **Level cap** — global cap, **Move all to cap**, evolution prompt when crossing level-up evolutions
- **PC box** — store Pokémon off the active team
- **Death box** — mark fainted Pokémon; optional **revival** for revival-rule runs
- Move Pokémon between team ↔ box ↔ death box (edit mode)

### Stats & comparison

- Pokémon search, stat comparison vs team (level-aware BST when levels differ)
- Evolution line preview, type analysis
- Optional IVs/EVs/nature on imported Showdown sets; neutral nature default otherwise
- **Gen 1–3 physical/special split** explained in Compare tab (type-based vs move category)

### Showdown

- **PokePaste import/export** for your team and opponent teams
- Parses level, EVs, IVs, nature, nicknames

### i18n & layout

- **English + Spanish** UI strings (toggle in header)
- **Responsive sidebar** — collapsible drawer on mobile for team & boxes

### Level cap insights

When you raise the level cap, hints show upcoming evolutions and notable level-up moves (from PokeAPI learnsets).

## Requirements

- Node.js 18+
- npm

## Setup

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Docker / Dockploy

Production image: multi-stage **Node 22 build** → **nginx** serving `dist/` (SPA routing + `/health`).

| Setting | Value |
|--------|--------|
| Build type | Dockerfile |
| Dockerfile path | `Dockerfile` |
| Docker context | `.` |
| Container port | `80` |

In Dockploy, add a domain pointing at port **80** on the container (Traefik handles external HTTPS). No runtime environment variables are required; the app is fully client-side.

**Local test:**

```bash
docker build -t nuzloke-helper .
docker run --rm -p 8080:80 nuzloke-helper
# open http://localhost:8080
```

Or: `npm run docker:prod` (uses `docker-compose.yml` → http://localhost:8080).

## How to test locally

1. `npm run dev` and open the app.
2. **Migration**: if you had an old team in `nuzloke-helper-team-v1`, it should appear as “My run”.
3. **Profiles**: create a hackrom profile (Gen 3 mechanics, Gen 9 mons) and an official profile (e.g. Emerald); switch between them.
4. **Team**: add Pokémon, use +1 level, raise level cap, use “Move all to cap”; confirm evolution modal on level-up evolutions (e.g. Bulbasaur → Ivysaur at 16).
5. **Boxes**: enable Edit, move a mon to PC box, mark one dead, enable revival and revive to box.
6. **Showdown**: paste a PokePaste export with EVs/IVs/nature; import to team or opponent tab.
7. **i18n**: switch EN/ES in header.
8. **Mobile**: narrow viewport — open “Team & boxes” drawer.
9. `npm run build` should pass with no TypeScript errors.

## Data notes

- Stats and typings come from **PokeAPI** (mainline games through modern generations).
- Type chart uses the **Gen 6+** chart (includes Fairy).
- Hackroms use closest mainline equivalent + manual profile settings; hack-specific learnsets/stats overrides are Phase 2.

## Storage schema (v2)

```json
{
  "version": 2,
  "activeProfileId": "uuid",
  "locale": "en",
  "profiles": [{
    "id": "uuid",
    "name": "My run",
    "settings": {
      "config": { "kind": "hackrom", "baseGeneration": 3, "pokemonGenerationScope": 9 },
      "levelCap": 50,
      "allowRevival": false
    },
    "team": [],
    "box": [],
    "deathBox": [],
    "opponentTeam": []
  }]
}
```

Each Pokémon slot includes: `slotId`, species/form ids, base stats, level, optional `ivs`/`evs`/`nature`, nickname.

## Releases

Pushes and merges to `main` run [semantic-release](https://semantic-release.gitbook.io/) via [`.github/workflows/release.yml`](.github/workflows/release.yml). Configuration lives in [`release.config.cjs`](release.config.cjs).

Version bumps follow [Conventional Commits](https://www.conventionalcommits.org/):

| Commit type | Version bump | Examples |
|-------------|--------------|----------|
| `fix:` | Patch | `fix: correct level cap on mobile` |
| `feat:` | Minor | `feat: add PC base-stats toggle` |
| `feat!:` or footer `BREAKING CHANGE:` | Major | `feat!: drop legacy storage format` |

Other prefixes (`chore:`, `docs:`, `refactor:`, …) do **not** trigger a release by default.

When a release is due, semantic-release creates a `vMAJOR.MINOR.PATCH` tag and a GitHub Release with generated notes. If nothing since the last tag is releasable, the workflow exits successfully without tagging.

To skip a release for one push, use a non-releasable commit message (e.g. `chore: update README`) or add `[skip ci]` / `chore(release):` only changes as appropriate for your workflow.

## Planned (Phase 2)

- Full move matchup comparator with TM assignment
- Gym leader matchup comparison
- Hackrom manual stat/learnset overrides
- Item suggestions
- Route encounter tracker (not planned unless requested)
