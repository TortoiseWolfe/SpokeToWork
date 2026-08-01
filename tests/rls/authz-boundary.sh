#!/usr/bin/env bash
# Consolidated authorization verification against local Supabase.
# Each check asserts the exploit is BLOCKED and the legitimate path still WORKS.
set -uo pipefail
cd /home/TurtleWolfe/repos/SpokeToWork
API=http://localhost:54321
ANON=$(grep '^SUPABASE_LOCAL_ANON_KEY=' .env | cut -d= -f2- | tr -d '"'\''\r')
PASS=0; FAIL=0
ok(){ echo "  PASS  $1"; PASS=$((PASS+1)); }
bad(){ echo "  FAIL  $1"; FAIL=$((FAIL+1)); }
psqlq(){ docker compose exec -T supabase-db psql -U postgres -d postgres -tAqc "$1" 2>/dev/null | tr -d '\r'; }
signup(){ curl -s -X POST "$API/auth/v1/signup" -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d "{\"email\":\"$1\",\"password\":\"NotAGenericPassword!7391\"}"; }

S=$RANDOM
RA=$(signup "va-$S@example.com"); TA=$(echo "$RA"|python3 -c "import json,sys;print(json.load(sys.stdin).get('access_token',''))"); UA=$(echo "$RA"|python3 -c "import json,sys;print(json.load(sys.stdin).get('user',{}).get('id',''))")
RB=$(signup "vb-$S@example.com"); TB=$(echo "$RB"|python3 -c "import json,sys;print(json.load(sys.stdin).get('access_token',''))"); UB=$(echo "$RB"|python3 -c "import json,sys;print(json.load(sys.stdin).get('user',{}).get('id',''))")

echo "== A. privilege escalation =="
curl -s -X PATCH "$API/rest/v1/user_profiles?id=eq.$UA" -H "apikey: $ANON" -H "Authorization: Bearer $TA" \
  -H "Content-Type: application/json" -d '{"is_admin":true}' >/dev/null
[ "$(psqlq "SELECT is_admin FROM user_profiles WHERE id='$UA'")" = "f" ] \
  && ok "is_admin cannot be self-granted" || bad "is_admin WAS self-granted"
curl -s -X PATCH "$API/rest/v1/user_profiles?id=eq.$UA" -H "apikey: $ANON" -H "Authorization: Bearer $TA" \
  -H "Content-Type: application/json" -d '{"role":"admin"}' >/dev/null
[ "$(psqlq "SELECT role FROM user_profiles WHERE id='$UA'")" = "worker" ] \
  && ok "role cannot be self-set to admin" || bad "role WAS self-set to admin"
curl -s -X PATCH "$API/rest/v1/user_profiles?id=eq.$UA" -H "apikey: $ANON" -H "Authorization: Bearer $TA" \
  -H "Content-Type: application/json" -d '{"display_name":"Legit"}' >/dev/null
[ "$(psqlq "SELECT display_name FROM user_profiles WHERE id='$UA'")" = "Legit" ] \
  && ok "legitimate profile edit still works" || bad "legitimate profile edit BROKEN"

echo "== B. home address exposure =="
curl -s -X POST "$API/rest/v1/user_home_locations" -H "apikey: $ANON" -H "Authorization: Bearer $TA" \
  -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" \
  -d "{\"user_id\":\"$UA\",\"home_address\":\"12 Victim Lane\",\"home_latitude\":35.04,\"home_longitude\":-85.30}" >/dev/null
OWN=$(curl -s "$API/rest/v1/user_home_locations?select=home_address" -H "apikey: $ANON" -H "Authorization: Bearer $TA")
echo "$OWN" | grep -q "12 Victim Lane" && ok "owner can read own home address" || bad "owner CANNOT read own home address"
OTHER=$(curl -s "$API/rest/v1/user_home_locations?select=user_id,home_address" -H "apikey: $ANON" -H "Authorization: Bearer $TB")
[ "$OTHER" = "[]" ] && ok "other user sees no home addresses" || bad "home addresses LEAKED: $OTHER"
LEGACY=$(curl -s "$API/rest/v1/user_profiles?select=home_address" -H "apikey: $ANON" -H "Authorization: Bearer $TB")
echo "$LEGACY" | grep -q "does not exist" && ok "home_address gone from user_profiles" || bad "home_address still on user_profiles"

echo "== C. employer access to job_applications =="
CO=$(psqlq "INSERT INTO shared_companies (name, metro_area_id) SELECT 'Verify Co $S', id FROM metro_areas LIMIT 1 RETURNING id" | grep -oE '[0-9a-f-]{36}' | head -1)
psqlq "INSERT INTO employer_company_links (user_id, shared_company_id) VALUES ('$UB','$CO') ON CONFLICT DO NOTHING" >/dev/null
curl -s -X POST "$API/rest/v1/job_applications" -H "apikey: $ANON" -H "Authorization: Bearer $TA" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$UA\",\"shared_company_id\":\"$CO\",\"position_title\":\"Mechanic\",\"status\":\"applied\",\"notes\":\"SECRETNOTE\",\"priority\":5}" >/dev/null
AID=$(psqlq "SELECT id FROM job_applications WHERE user_id='$UA' LIMIT 1" | grep -oE '[0-9a-f-]{36}' | head -1)

BASE=$(curl -s "$API/rest/v1/job_applications?select=notes" -H "apikey: $ANON" -H "Authorization: Bearer $TB")
[ "$BASE" = "[]" ] && ok "employer cannot read applications off base table" || bad "employer READ base table: $BASE"
curl -s -X PATCH "$API/rest/v1/job_applications?id=eq.$AID" -H "apikey: $ANON" -H "Authorization: Bearer $TB" \
  -H "Content-Type: application/json" -d '{"notes":"WIPED"}' >/dev/null
[ "$(psqlq "SELECT notes FROM job_applications WHERE id='$AID'")" = "SECRETNOTE" ] \
  && ok "employer cannot overwrite seeker notes" || bad "employer WIPED seeker notes"
VIEW=$(curl -s "$API/rest/v1/employer_applications?select=position_title,status" -H "apikey: $ANON" -H "Authorization: Bearer $TB")
echo "$VIEW" | grep -q "Mechanic" && ok "employer can read via sanctioned view" || bad "employer view BROKEN: $VIEW"
VN=$(curl -s "$API/rest/v1/employer_applications?select=notes" -H "apikey: $ANON" -H "Authorization: Bearer $TB")
echo "$VN" | grep -q "does not exist" && ok "view exposes no notes column" || bad "view EXPOSES notes: $VN"
curl -s -X POST "$API/rest/v1/rpc/employer_update_application_status" -H "apikey: $ANON" -H "Authorization: Bearer $TB" \
  -H "Content-Type: application/json" -d "{\"p_application_id\":\"$AID\",\"p_status\":\"interviewing\"}" >/dev/null
[ "$(psqlq "SELECT status FROM job_applications WHERE id='$AID'")" = "interviewing" ] \
  && ok "employer can advance status via RPC" || bad "employer RPC BROKEN"
UNAUTH=$(curl -s -X POST "$API/rest/v1/rpc/employer_update_application_status" -H "apikey: $ANON" -H "Authorization: Bearer $TA" \
  -H "Content-Type: application/json" -d "{\"p_application_id\":\"$AID\",\"p_status\":\"offer\"}")
echo "$UNAUTH" | grep -qi "Not authorized" && ok "RPC rejects a non-linked caller" || bad "RPC allowed non-linked caller: $UNAUTH"

echo
echo "passed=$PASS failed=$FAIL"
[ "$FAIL" -eq 0 ]
