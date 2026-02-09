---
name: protect-auth-urls
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: docker-compose\.yml$
  - field: new_text
    operator: regex_match
    pattern: API_EXTERNAL_URL|GOTRUE_SITE_URL
---

Do NOT hardcode or change API_EXTERNAL_URL or GOTRUE_SITE_URL in docker-compose.yml. These are set dynamically by scripts/supabase-up.sh at startup based on OS-assigned ports. Changing them here will break auth. If you need to test auth locally, use the startup script instead of editing these values.
