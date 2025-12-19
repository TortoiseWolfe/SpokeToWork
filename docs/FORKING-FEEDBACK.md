# ScriptHammer Template - Forking Feedback

This document captures issues encountered when forking the ScriptHammer template to create SpokeToWork. **This feedback is intended for the ScriptHammer maintainers** to improve the forking experience.

## Summary

Forking ScriptHammer required updating **200+ files** with hardcoded references. The Docker-first architecture also created friction with git hooks. Additionally, tests require Supabase mocking, description assertions need updating, **the basePath secret in deploy.yml breaks GitHub Pages for forks** (Issue #10), **production crashes without Supabase GitHub secrets** (Issue #11), **the footer template link needs manual update** (Issue #12), **the PWA manifest description is generated at build time** (Issue #13), **blog generation fails due to gray-matter/js-yaml version conflict** (Issue #14), and **Leaflet raster tiles have illegible fonts on high-DPI screens** (Issue #15 - migrated to MapLibre GL).

---

## Issues Encountered

### 1. Massive Number of Hardcoded References

**Problem:** 200+ files contain hardcoded "ScriptHammer" or "scripthammer" references that must be manually updated when forking.

**Affected Areas:**

| Category       | Files | Examples                                                  |
| -------------- | ----- | --------------------------------------------------------- |
| Core Config    | 10+   | `package.json`, `docker-compose.yml`, `project.config.ts` |
| Scripts        | 15+   | `validate-ci.sh`, `seed-test-users.ts`, `generate-*.js`   |
| Documentation  | 50+   | `README.md`, `CLAUDE.md`, all `/docs/*.md`                |
| Specs          | 80+   | All files in `/specs/` directory                          |
| Blog Content   | 20+   | `/public/blog/*.md`, `blog-data.json`                     |
| Tests          | 10+   | Contract tests, fixtures                                  |
| Service Worker | 1     | `public/sw.js` (cache names)                              |
| Workflows      | 5+    | `.github/workflows/*.yml`                                 |

**Suggested Fix:** Create a `scripts/rebrand.sh` script that:

```bash
#!/bin/bash
# Usage: ./scripts/rebrand.sh NewProjectName NewOwner "New description"

OLD_NAME="ScriptHammer"
OLD_NAME_LOWER="scripthammer"
NEW_NAME=$1
NEW_NAME_LOWER=$(echo "$1" | tr '[:upper:]' '[:lower:]')
NEW_OWNER=$2
NEW_DESC=$3

# 1. Replace text content in all files
find . -type f \( -name "*.sh" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" \
  -o -name "*.json" -o -name "*.md" -o -name "*.yml" \) \
  ! -path "./node_modules/*" ! -path "./.next/*" ! -path "./out/*" \
  -exec sed -i "s/$OLD_NAME_LOWER/$NEW_NAME_LOWER/g; s/$OLD_NAME/$NEW_NAME/g" {} \;

# 2. Rename files that contain old project name
find . -name "*${OLD_NAME}*" -type f ! -path "./node_modules/*" ! -path "./.next/*" | while read f; do
  mv "$f" "${f//$OLD_NAME/$NEW_NAME}"
done

# 3. Update docker-compose service name
sed -i "s/scripthammer:/$NEW_NAME_LOWER:/g" docker-compose.yml

# 4. Delete CNAME if not using custom domain
rm -f public/CNAME

echo "Rebranded to $NEW_NAME. Run 'docker compose up --build' to rebuild."
```

### 2. Git Commits Fail in Docker-First Setup

**Problem:** Pre-commit hooks run on the host but `lint-staged` is only in the container.

**Error:**

```
sh: 1: lint-staged: not found
husky - pre-commit script failed (code 1)
```

**Suggested Fix for ScriptHammer:**

1. Add to `.env.example`:

```bash
# Git config for Docker commits
GIT_AUTHOR_NAME=YourGitHubUsername
GIT_AUTHOR_EMAIL=your-email@example.com
```

2. Add to `docker-compose.yml`:

```yaml
environment:
  - GIT_AUTHOR_NAME=${GIT_AUTHOR_NAME}
  - GIT_AUTHOR_EMAIL=${GIT_AUTHOR_EMAIL}
  - GIT_COMMITTER_NAME=${GIT_AUTHOR_NAME}
  - GIT_COMMITTER_EMAIL=${GIT_AUTHOR_EMAIL}
```

3. Document that commits should be via:

```bash
docker compose exec scripthammer git commit -m "message"
```

### 3. Git Safe Directory Issue

**Problem:** Container runs as root but `/app` is owned by host user.

**Error:**

```
fatal: detected dubious ownership in repository at '/app'
```

**Suggested Fix:** Add to `docker/Dockerfile`:

```dockerfile
RUN git config --global --add safe.directory /app
```

And document that users need:

```bash
git config --global --add safe.directory /app
```

### 4. CNAME Blocks GitHub Pages Default URL

**Problem:** `public/CNAME` is set to `scripthammer.com`, preventing `<user>.github.io/<repo>` URL.

**Suggested Fix:** Either:

- Remove `public/CNAME` from the template entirely
- Or add to rebrand script: `rm -f public/CNAME`

### 5. Service Worker Cache Names Hardcoded

**Problem:** `public/sw.js` has hardcoded cache version:

```javascript
const CACHE_VERSION = 'scripthammer-v1.0.0';
```

**Suggested Fix:** Use environment variable or auto-detect from package.json:

```javascript
const CACHE_VERSION = `${PROJECT_NAME}-v${VERSION}`;
```

### 6. File Names Not Renamed by sed

**Problem:** Using `sed` to replace text only changes file _contents_, not file _names_. This causes TypeScript errors when imports reference the new name but files still have the old name.

**Example:**

```
src/components/atomic/SpinningLogo/
├── ScriptHammerLogo.tsx          # ← File still named ScriptHammer
├── LayeredScriptHammerLogo.tsx   # ← File still named ScriptHammer
├── index.tsx                      # ← Import says './SpokeToWorkLogo' (broken!)
└── SpinningLogo.stories.tsx       # ← Import says './LayeredSpokeToWorkLogo' (broken!)
```

**Error:**

```
error TS2307: Cannot find module './SpokeToWorkLogo' or its corresponding type declarations.
```

**Fix:** After running sed, also rename files:

```bash
# Find and rename files with old project name
find . -name "*ScriptHammer*" -type f ! -path "./node_modules/*" | while read f; do
  mv "$f" "${f//ScriptHammer/YourNewName}"
done
```

### 7. Admin User Email Hardcoded

**Problem:** Multiple files reference `admin@scripthammer.com`:

- `scripts/seed-test-users.ts`
- `tests/contract/auth/admin-user.contract.test.ts`
- Various spec files

**Suggested Fix:** Use environment variable `ADMIN_EMAIL` with fallback.

### 8. Tests Fail Without Supabase Environment Variables

**Problem:** After forking, 37+ unit tests fail with "Missing Supabase environment variables" because `tests/setup.ts` doesn't mock the Supabase client.

**Error:**

```
Error: Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.
```

**Suggested Fix:** Add Supabase client mock to `tests/setup.ts`:

```typescript
// Mock Supabase client for all tests
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: null }, error: null })
      ),
      signInWithPassword: vi.fn(() =>
        Promise.resolve({ data: {}, error: null })
      ),
      signUp: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      resetPasswordForEmail: vi.fn(() => Promise.resolve({ error: null })),
      updateUser: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      /* chain methods */
    })),
    channel: vi.fn(() => {
      const channel = {
        on: vi.fn(() => channel),
        subscribe: vi.fn(() => channel),
        unsubscribe: vi.fn(),
      };
      return channel;
    }),
    removeChannel: vi.fn(),
  })),
  getSupabase: vi.fn(() => ({})),
  supabase: {},
}));
```

### 9. Project Description in Tests Hardcoded

**Problem:** Tests in `src/config/__tests__/project.config.test.ts` expect the original template description:

```typescript
expect(config.projectDescription).toContain('Opinionated Next.js template');
```

After rebranding, the description changes but tests still expect the old text.

**Suggested Fix:** Either:

- Use a more generic assertion: `expect(config.projectDescription).toBeTruthy()`
- Or include description updates in the rebrand script

### 10. NEXT_PUBLIC_BASE_PATH Secret Breaks Auto-Detection

**Problem:** In `.github/workflows/deploy.yml`, the line:

```yaml
NEXT_PUBLIC_BASE_PATH: ${{ secrets.NEXT_PUBLIC_BASE_PATH }}
```

When forking, this secret doesn't exist. GitHub Actions passes **empty string `""`** (not `undefined`) for missing secrets.

In `next.config.ts`, the basePath logic is:

```javascript
if (process.env.NEXT_PUBLIC_BASE_PATH !== undefined) {
  return process.env.NEXT_PUBLIC_BASE_PATH; // Returns "" when secret doesn't exist!
}
// Auto-detection never runs
```

**Result:** All CSS/JS assets load from `/_next/static/...` instead of `/RepoName/_next/static/...`, causing 404 errors. The site renders without styling (massive icons, broken layout).

**Root Cause:** Empty string `""` is `!== undefined`, so the auto-detection in `scripts/detect-project.js` is bypassed.

**Suggested Fix:** Remove the `NEXT_PUBLIC_BASE_PATH` line from `deploy.yml` entirely. The auto-detection in `scripts/detect-project.js` correctly handles this:

```javascript
const basePath =
  isGitHubActions && info.isGitHub && !cnameExists
    ? `/${info.projectName}` // "/SpokeToWork"
    : '';
```

Auto-detection uses:

- `GITHUB_ACTIONS=true` (set by GitHub automatically)
- Git remote URL (detects repo name)
- Absence of CNAME file (custom domain check)

**Alternative:** If keeping the secret line, update `next.config.ts` to treat empty string as undefined:

```javascript
const envBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
if (envBasePath !== undefined && envBasePath !== '') {
  return envBasePath;
}
```

### 11. Production Crashes Without Supabase GitHub Secrets

**Problem:** After forking, the production site shows "Something went wrong! Try again" because `src/lib/supabase/client.ts` throws an error when Supabase environment variables are missing in the browser.

**Error (in browser console):**

```
Error: Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.
```

**Root Cause:** The Supabase client initialization (lines 41-45) throws when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set. In production, these values come from GitHub secrets, which forks don't have configured.

**Required Setup:**

1. Create a Supabase project at https://supabase.com/dashboard
2. Get credentials from **Settings > API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Add as GitHub secrets at `https://github.com/<owner>/<repo>/settings/secrets/actions`

**Suggested Fix:** Either:

- Document Supabase setup as a required step in the fork workflow
- Or modify `src/lib/supabase/client.ts` to return a disabled mock client instead of throwing, allowing the app to run in "offline mode" without Supabase

### 12. Footer Template Link Needs Manual Update

**Problem:** The footer says "Open source template available" but doesn't link anywhere. Forkers need to manually add a link back to the template source.

**Current Code** (`src/components/Footer.tsx`):

```tsx
<p className="text-base-content/40 mt-1 text-xs">
  Open source template available
</p>
```

**Suggested Fix:** The template should include the link by default:

```tsx
<p className="text-base-content/40 mt-1 text-xs">
  Open source template available at{' '}
  <a
    href="https://scripthammer.com"
    target="_blank"
    rel="noopener noreferrer"
    className="link-hover link"
  >
    ScriptHammer.com
  </a>
</p>
```

### 13. PWA Manifest Description is Generated, Not Static

**Problem:** After rebranding, the `public/manifest.json` keeps reverting to the old template description even after editing it directly.

**Root Cause:** `public/manifest.json` is **generated** by `scripts/generate-manifest.js` during the prebuild process. Line 53 has a hardcoded description:

```javascript
description: `${projectConfig.projectName} - Modern Next.js template with PWA, theming, and interactive components`,
```

**Files that need description updates for rebranding:**

| File                                     | Purpose                               |
| ---------------------------------------- | ------------------------------------- |
| `scripts/generate-manifest.js` (line 53) | **Source** - PWA manifest description |
| `src/app/page.tsx` (lines 66-74)         | Home page hero tagline                |
| `package.json`                           | npm package description               |
| `src/config/project.config.ts`           | App description constant              |
| `README.md`                              | Repository description                |

**Suggested Fix:**

1. Add `public/manifest.json` to `.gitignore` (it's generated)
2. Update the description in `scripts/generate-manifest.js` not the manifest file
3. Document this in the rebrand script or README

**Verification:**

```bash
docker compose exec spoketowork node scripts/generate-manifest.js
cat public/manifest.json | grep description
```

### 14. Blog Generation Fails Due to gray-matter/js-yaml Version Conflict

**Problem:** Running `pnpm run generate:blog` fails with the error:

```
Error processing /app/public/blog/getting-started-job-hunt-companion.md: Function yaml.safeLoad is removed in js-yaml 4. Use yaml.load instead, which is now safe by default.
```

**Root Cause:** The `package.json` has a pnpm override forcing all packages to use js-yaml 4.x:

```json
"pnpm": {
  "overrides": {
    "js-yaml": ">=4.1.1"
  }
}
```

However, `gray-matter@4.0.3` (the YAML frontmatter parser used by `scripts/generate-blog-data.js`) requires `js-yaml@^3.13.1` and uses the deprecated `yaml.safeLoad()` function that was removed in js-yaml 4.0.0.

**Affected Files:**

- `scripts/generate-blog-data.js` - Blog generation script
- `src/lib/blog/blog-data.json` - Generated blog data (fails to update)

**Fix:** Add a package-specific override for gray-matter in `package.json`:

```json
"pnpm": {
  "overrides": {
    "js-yaml": ">=4.1.1",
    "gray-matter>js-yaml": "^3.14.1"
  }
}
```

Then reinstall and regenerate:

```bash
docker compose exec spoketowork pnpm install
docker compose exec spoketowork pnpm run generate:blog
```

**Suggested Fix for ScriptHammer:** Add the `gray-matter>js-yaml` override to the template's `package.json` so forks work out of the box. Alternatively, consider upgrading to a frontmatter parser that's compatible with js-yaml 4.x.

**Long-term Solution:** Monitor `gray-matter` for a new release that supports js-yaml 4.x, or switch to an alternative like `front-matter` or `remark-frontmatter` that doesn't have this compatibility issue.

### 15. Map Font Legibility Issues with Leaflet Raster Tiles

**Problem:** The default Leaflet + raster tile setup (CyclOSM, OpenStreetMap) renders street names and labels at the tile server's fixed resolution. On high-DPI screens and at certain zoom levels, text becomes too small to read comfortably—especially critical for a cycling app where users need to quickly identify street names while riding.

**Root Cause:** Raster tiles have fonts "baked in" at a fixed size. The client cannot adjust font sizes because the text is part of the pre-rendered PNG/JPEG image.

**User-Visible Issues:**

- Street names illegible at zoom 13-15 on mobile devices
- Place labels too small for quick glancing
- No way to increase map text size without changing zoom level
- Dark mode requires completely different tile set (not auto-detected)

**Solution Implemented:** Migrate from Leaflet (raster) to MapLibre GL JS (vector tiles):

| Before (Leaflet)              | After (MapLibre GL)                           |
| ----------------------------- | --------------------------------------------- |
| `react-leaflet` + `leaflet`   | `react-map-gl/maplibre` + `maplibre-gl`       |
| CyclOSM raster tiles          | OpenFreeMap vector tiles                      |
| Fixed font sizes (baked in)   | Client-controlled 16px+ fonts                 |
| Separate light/dark tile URLs | JSON style files with theme switching         |
| ~85KB bundle                  | ~200KB bundle (mitigated with code-splitting) |

**Key Files Created/Modified:**

```
src/styles/
├── map-style-light.json    # MapLibre style spec (light theme)
└── map-style-dark.json     # MapLibre style spec (dark theme)

src/hooks/
└── useMapTheme.ts          # Auto-detects DaisyUI theme, returns style

src/components/map/
├── MapContainer/
│   ├── MapContainerInner.tsx  # Migrated to react-map-gl/maplibre
│   └── MapContainer.tsx       # Updated wrapper
└── RoutePolyline/
    └── RoutePolyline.tsx      # Migrated to MapLibre Source/Layer API
```

**Suggested Fix for ScriptHammer:**

1. **Replace Leaflet with MapLibre GL** as the default map library:

   ```bash
   pnpm remove leaflet react-leaflet @types/leaflet
   pnpm add maplibre-gl react-map-gl
   ```

2. **Use OpenFreeMap** (no API key required) or provide tile source config:

   ```json
   {
     "sources": {
       "openmaptiles": {
         "type": "vector",
         "url": "https://tiles.openfreemap.org/planet"
       }
     }
   }
   ```

3. **Create theme-aware map styles** with minimum 16px fonts:

   ```json
   {
     "id": "road-label",
     "type": "symbol",
     "layout": {
       "text-size": [
         "interpolate",
         ["linear"],
         ["zoom"],
         10,
         12,
         13,
         16,
         16,
         20
       ]
     }
   }
   ```

4. **Add DaisyUI theme detection hook** that observes `data-theme` attribute

5. **Use dynamic import** to mitigate bundle size:
   ```typescript
   const MapContainer = dynamic(() => import('./MapContainerInner'), {
     ssr: false,
   });
   ```

**Benefits:**

- Accessible, legible fonts at all zoom levels
- Automatic dark mode switching with DaisyUI themes
- Custom styling for bike lanes (highlight in pink: `#d63384`)
- Better touch interaction on mobile
- Offline tile caching support (via service worker)

**Trade-offs:**

- ~115KB larger bundle (200KB vs 85KB), mitigated with lazy loading
- More complex style configuration (JSON style spec vs simple URL)
- Requires understanding MapLibre expressions for dynamic styling

---

## Recommended Fork Workflow

Based on our experience, here's the complete workflow:

### Prerequisites

```bash
# Add to your ~/.gitconfig
git config --global --add safe.directory /app
```

### Step-by-Step

1. **Fork & Clone**

   ```bash
   gh repo fork TortoiseWolfe/ScriptHammer --clone
   cd YourNewProject
   ```

2. **Create .env**

   ```bash
   cp .env.example .env
   # Edit .env with your values:
   # UID, GID, GIT_AUTHOR_NAME, GIT_AUTHOR_EMAIL
   ```

3. **Run Rebrand Script** (if it exists, otherwise manual)

   ```bash
   ./scripts/rebrand.sh YourProject YourUsername "Your description"
   ```

4. **Delete CNAME** (if using GitHub Pages default URL)

   ```bash
   rm public/CNAME
   ```

5. **Start Docker & Verify**

   ```bash
   docker compose up -d
   docker compose exec yourproject pnpm run build
   ```

6. **Commit & Push**

   ```bash
   docker compose exec yourproject git add -A
   docker compose exec yourproject git commit -m "Rebrand to YourProject"
   git push
   ```

7. **Set Up Supabase** (Required for production)

   ```bash
   # 1. Create project at https://supabase.com/dashboard
   # 2. Get credentials from Settings > API
   # 3. Add as GitHub secrets:
   ```

   Go to `https://github.com/<owner>/<repo>/settings/secrets/actions` and add:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your anon/public key

8. **Enable GitHub Pages**
   - Settings -> Pages -> Source: "GitHub Actions"

---

## Environment

- **Source Template:** ScriptHammer (TortoiseWolfe/ScriptHammer)
- **Forked To:** SpokeToWork
- **Date:** December 2025
- **Files Updated:** 200+
- **Time Required:** ~2 hours (would be <5 minutes with rebrand script)

---

_This feedback is provided to help improve the ScriptHammer template for future users._
