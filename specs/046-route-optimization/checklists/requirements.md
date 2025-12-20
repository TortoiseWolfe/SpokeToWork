# Requirements Quality Checklist: Route Optimization

**Feature**: 046-route-optimization
**Date**: 2025-12-19
**Target Audience**: Requirements Author / Reviewer

## Purpose

This checklist validates the QUALITY of requirements in spec.md, not implementation behavior.
Each item tests whether requirements are complete, clear, measurable, and consistent.

---

## Completeness

- [x] **CHK001**: Are all user stories prioritized (P1, P2, P3)? [Spec §User Scenarios]
  - ✅ 4 stories with P1, P1, P2, P3 priorities

- [x] **CHK002**: Does each user story have acceptance scenarios in Given/When/Then format? [Spec §Acceptance Scenarios]
  - ✅ All 4 stories have acceptance scenarios

- [x] **CHK003**: Are edge cases documented for boundary conditions? [Spec §Edge Cases]
  - ✅ 7 edge cases documented (including 0 companies)

- [x] **CHK004**: Are non-functional requirements specified (performance, offline, etc.)? [Spec §NFR]
  - ✅ NFR-001 through NFR-004 defined

- [x] **CHK005**: Are success criteria measurable and quantified? [Spec §Success Criteria]
  - ✅ SC-001 through SC-006 with specific metrics

---

## Clarity

- [x] **CHK006**: Is "optimization" clearly defined as TSP-based ordering? [Spec §FR-001, Clarifications]
  - ✅ Clarified as `@peerless/tsp` with 2-opt + nearest neighbor

- [x] **CHK007**: Is "home location" clearly tied to existing user_profiles fields? [Spec §Assumptions]
  - ✅ Assumption #1 references HomeLocationSettings component

- [x] **CHK008**: Are start/end point types ('home' vs 'custom') explicitly defined? [Spec §Key Entities]
  - ✅ RouteStartEndPoint entity with LocationType

- [x] **CHK009**: Is the comparison modal behavior specified (before/after display)? [Clarifications]
  - ✅ Clarified as modal with map preview

- [x] **CHK010**: Is "auto-suggest frequency limiting" quantified (how many dismissals before reducing)? [Spec §US3, FR-018]
  - ✅ FIXED: US3 scenarios 4-6 specify 50% at 3 dismissals, 25% at 6, disabled at 10+
  - ✅ FR-018 codifies exponential backoff behavior

---

## Consistency

- [x] **CHK011**: Do FR numbers match acceptance scenarios? [Cross-reference]
  - ✅ FR-001 to FR-018 cover all acceptance scenarios

- [x] **CHK012**: Are terminology consistent (route vs path vs circuit)? [Terminology]
  - ✅ "route" used consistently throughout

- [x] **CHK013**: Do performance goals in NFR match success criteria? [NFR vs SC]
  - ✅ NFR-001 (5s for 20 companies) aligns with SC-001 (3s for 10 companies)

- [x] **CHK014**: Are database field names consistent with plan.md? [Plan §Data Model]
  - ✅ start_type, end_type, is_round_trip match

---

## Measurability

- [x] **CHK015**: Can SC-002 (15% distance reduction) be tested? [SC-002]
  - ✅ Measurable by comparing random vs optimized ordering

- [x] **CHK016**: Can SC-006 (500ms auto-suggest) be tested? [SC-006]
  - ✅ Measurable with performance timing

- [x] **CHK017**: Is "optimization complete within 5 seconds" testable? [NFR-001]
  - ✅ Clear timeout threshold

- [x] **CHK018**: Is "gracefully handle" in FR-012 quantified? [FR-012]
  - ✅ FIXED: FR-012 now specifies: (a) warning toast with excluded companies, (b) exclude from optimization, (c) show edit link to add coordinates

---

## Coverage

- [x] **CHK019**: Are all P1 requirements covered by FRs? [Coverage]
  - ✅ US1 → FR-001, FR-007, FR-009-015
  - ✅ US2 → FR-002, FR-003, FR-016

- [x] **CHK020**: Is error handling specified for OSRM failures? [Edge Cases]
  - ✅ "Graceful fallback for OSRM path generation" in edge cases

- [x] **CHK021**: Are accessibility requirements implied (modal, buttons)? [Implicit]
  - ✅ Component structure mandate includes a11y tests

---

## Edge Cases

- [x] **CHK022**: What happens with exactly 3 companies (minimum for optimization)? [Boundary]
  - ✅ US1 scenario 3 handles "2 or fewer"

- [x] **CHK023**: What happens at exactly 50 companies (soft limit)? [Boundary]
  - ✅ Edge case mentions "50+ companies" warning

- [x] **CHK024**: What if user has no companies on route but clicks optimize? [Edge Cases, FR-017]
  - ✅ FIXED: Edge case added for 0 companies
  - ✅ FR-017 specifies: disable button, show info message

---

## Summary

| Category      | Pass   | Fail  | Total  |
| ------------- | ------ | ----- | ------ |
| Completeness  | 5      | 0     | 5      |
| Clarity       | 5      | 0     | 5      |
| Consistency   | 4      | 0     | 4      |
| Measurability | 4      | 0     | 4      |
| Coverage      | 3      | 0     | 3      |
| Edge Cases    | 3      | 0     | 3      |
| **Total**     | **24** | **0** | **24** |

### All Items Resolved ✅

All 3 previously identified gaps have been fixed in spec.md:

1. **CHK010**: ✅ Auto-suggest frequency now quantified in US3 scenarios 4-6 and FR-018
2. **CHK018**: ✅ FR-012 now defines specific handling for missing coordinates
3. **CHK024**: ✅ Edge case and FR-017 handle empty route optimization

**Requirements quality validation: PASSED**
