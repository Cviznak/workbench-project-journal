# Workbench 3.0 — Maker Project Journal & Depot

A fast, lightweight, uncluttered workshop journal and inventory depot built for makers, fabricators, and 3D printing enthusiasts.

Designed with a clean, mobile-first responsive layout, dark/light theme support, offline Service Worker caching, and zero forced starter defaults.

---

## What's New in Workbench 3.0

- 🪵 **Projects Journal**: Track builds, checklists, photo logs, and project materials organized into collapsible **Folders** with item counts and cost subtotals.
- ⧉ **Copy & Edit Variants**: Duplicate any material variant (e.g. swap colors, wood species, or fastener sizes) or edit in 1 click.
- 📦 **Workshop Depot & Filament Inventory**:
  - Raw materials, consumables, and tools organized into custom Folders.
  - 🖨️ **3D Printing Filament Spool Depot** with visual color swatches and quick remaining weight tracking.
  - **Copy Spool (⧉)**: Duplicate a spool profile in 1 click to quickly log new filament colors from the same brand/material.
  - Quick quantity bump buttons (`+` / `-`).
- 💡 **Project Ideas**: Quick inspiration capture with **zero starter defaults**. Ideas survive browser reloads and convert to full projects in 1 click (**🚀 Make Project**).
- 🎵 **Focus & Ambient Soundscapes**: 100% offline Web Audio sound synthesizers (Lo-Fi Chill Chords, Rainy Workshop, Zen Wind Bells, Grounding Drone) paired with a 25-minute Pomodoro timer.
- 📱 **Mobile-First Experience**: Clean sticky top header with quick chill audio toggle on desktop, and an ergonomic bottom navigation bar on mobile phones.
- 💾 **Reliable Dual-Persistence**: Automatically saves to both LocalStorage and IndexedDB with 1-click JSON backup export and restore.

---

## Hosting from the `clean` Branch on GitHub Pages

Workbench 3.0 is a 100% client-side static application requiring zero backend server setup.

### Option 1: Direct Branch Hosting (Recommended)
1. Go to your repository on GitHub: `https://github.com/Cviznak/workbench-project-journal`
2. Click **Settings** → **Pages** (in the left sidebar).
3. Under **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: Select `clean` and `/ (root)`
   - Click **Save**.
4. GitHub Pages will build and deploy your site within 1–2 minutes at:
   `https://cviznak.github.io/workbench-project-journal/`

### Option 2: Automated GitHub Actions
A GitHub Actions workflow is included at `.github/workflows/deploy.yml`. If your repository has GitHub Pages source set to **GitHub Actions**, every push to the `clean` branch will automatically deploy the site.

---

## Legacy History & Backups

The legacy multi-suite version (with 45,000+ lines of experimental code, studio suites, and skills XP) is safely preserved on the remote backup branch:
- **Branch**: `backup-legacy-v2`
- You can switch back or reference it anytime using `git checkout backup-legacy-v2`.

---

## Local Development & Testing

Simply open `index.html` in any web browser.

To run verification tests:
```bash
# Check syntax of all JavaScript files
node scratch/verify_syntax.js

# Run integration tests (zero defaults, spool copy, material folders)
node scratch/test_clean_v3_integration.js

# Verify 0 CR characters (pure LF line endings)
node scratch/check_crlf.js
```
