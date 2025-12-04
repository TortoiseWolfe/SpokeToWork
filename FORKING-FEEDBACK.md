# ScriptHammer Template - Forking Feedback

This document captures issues encountered when forking the ScriptHammer template to create SpokeToWork. **This feedback is intended for the ScriptHammer maintainers** to improve the forking experience.

## Summary

Forking ScriptHammer required updating **200+ files** with hardcoded references. The Docker-first architecture also created friction with git hooks.

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

7. **Enable GitHub Pages**
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
