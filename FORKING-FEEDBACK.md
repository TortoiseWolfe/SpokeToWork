# SpokeToWork Template - Forking Feedback

This document captures issues encountered when forking the SpokeToWork template to create a new project (SpokeToWork).

## Issues Encountered

### 1. Git Commits Fail in Docker-First Setup

**Problem:** Pre-commit hooks fail because `lint-staged` is not installed locally.

**Error:**

```
sh: 1: lint-staged: not found
husky - pre-commit script failed (code 1)
```

**Cause:** The Docker-first architecture installs `node_modules` only inside the container, but husky runs on the host machine when you `git commit`.

**Workarounds:**

- `HUSKY=0 git commit -m "message"` - Skip hooks (not ideal)
- Install node_modules locally - Violates Docker-first principle
- Commit through Docker - Requires git config in container

**Suggested Fix:**

1. Add git credentials to `.env` (not committed to repo):

```bash
GIT_AUTHOR_NAME=YourGitHubUsername
GIT_AUTHOR_EMAIL=your-email@example.com
```

2. Reference in docker-compose.yml (without hardcoded defaults):

```yaml
environment:
  - GIT_AUTHOR_NAME=${GIT_AUTHOR_NAME}
  - GIT_AUTHOR_EMAIL=${GIT_AUTHOR_EMAIL}
  - GIT_COMMITTER_NAME=${GIT_AUTHOR_NAME}
  - GIT_COMMITTER_EMAIL=${GIT_AUTHOR_EMAIL}
```

3. Add safe.directory (see Issue #4)
4. Commit via: `docker compose exec <service> git commit -m "message"`

### 2. Hardcoded References Throughout Codebase

**Problem:** Multiple files contain hardcoded references to "SpokeToWork" and "spoketowork.com" that must be manually updated.

**Files requiring updates:**

- `package.json` - name, description
- `docker-compose.yml` - service name, network name
- `README.md` - project title, description
- `CLAUDE.md` - all Docker commands
- `src/config/project.config.ts` - default values
- `src/config/project-status.json` - project identity
- `scripts/generate-sitemap.js` - SITE_URL
- `scripts/generate-rss.js` - SITE_URL, descriptions
- `.github/workflows/*.yml` - URLs, project references
- `src/app/page.tsx` - Storybook/Source links
- `src/app/status/page.tsx` - hardcoded URLs
- And more...

**Suggested Fix:** Create a `scripts/rebrand.js` script that:

1. Prompts for new project name, owner, description
2. Updates all hardcoded references automatically
3. Deletes `public/CNAME` if using GitHub Pages default URL

### 3. Custom Domain File (CNAME) Blocks GitHub Pages

**Problem:** The `public/CNAME` file is set to `spoketowork.com`, which prevents GitHub Pages from using the default `<user>.github.io/<repo>` URL.

**Fix:** Delete `public/CNAME` when not using a custom domain.

### 4. Git Config Not Available in Container

**Problem:** Running `git commit` inside the Docker container fails with multiple issues:

1. "Author identity unknown" - no git user config
2. "dubious ownership" - /app owned by different user than container root

**Errors:**

```
fatal: unable to auto-detect email address (got 'root@<container>.(none)')
fatal: detected dubious ownership in repository at '/app'
```

**Fix:**

1. Add git environment variables to docker-compose.yml (see Issue #1)
2. Add safe.directory to your local .gitconfig:

```bash
git config --global --add safe.directory /app
```

The Dockerfile should also include this (check `docker/Dockerfile`):

```dockerfile
RUN git config --global --add safe.directory /app
```

### 5. Missing Documentation for Fork Workflow

**Problem:** No clear documentation on the complete steps needed to fork and rebrand the template.

**Suggested Addition to TEMPLATE-GUIDE.md:**

1. Fork the repository
2. Clone locally
3. Run rebrand script (suggested above)
4. Update `.env` with UID/GID
5. Delete `public/CNAME` if not using custom domain
6. Verify build: `docker compose exec <service> pnpm run build`
7. Push to GitHub
8. Enable GitHub Pages in repository settings

## Environment

- Template: SpokeToWork
- Forked To: SpokeToWork
- Date: 2024-12
- Docker-first: Yes
- Target: GitHub Pages (default URL)
