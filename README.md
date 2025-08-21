# Vacation Picker — Full Test Build (Static React)

A GitHub Pages–ready **static React app** (no build step required) for detective vacation scheduling with core rule enforcement.

## Features
- **Seniority list** (your 6 detectives preloaded)
- **Round mode** (optional): only the current detective can pick; auto-advances after each pick
- **Rules enforced**:
  - Max **24 days** per detective
  - Max **6 picks** per detective
  - Max **2 summer picks** per detective (June 21 – Sept 3; configurable)
  - Max **off per day** (default 1; configurable)
  - **Blackout date ranges** (configurable; cannot be picked)
- **Per-day schedule map** (see who’s off each date)
- **Local persistence** via `localStorage`
- **Export/Import JSON** for backups or sharing
- **Admin panel** for config changes (no password in this test build)

## Quick Start (GitHub Pages)
1. Create a repo (e.g., `vacation-picker-full`).
2. Upload the files from this folder (`index.html`, `app.jsx`, `style.css`, `README.md`).
3. Settings → Pages → Deploy from a branch → `main` (root).
4. Visit `https://YOUR-USERNAME.github.io/vacation-picker-full/`

## Admin Panel
- Toggle **Round Mode**
- Configure **Max off per day**
- Configure **Summer Window** and **Summer picks cap**
- Add/remove **Blackout ranges**
- Reset all data (careful!)

## Notes
- This is a static prototype. For audit trails & multi-user concurrency, we can add a small backend or write-back to GitHub via Actions later.
- “4 on / 4 off” is not directly enforced here because vacation picks are in free date ranges; if you want constraints relative to shifts, we can add that rule next.

© 2025 — Detective Division Scheduling Prototype
