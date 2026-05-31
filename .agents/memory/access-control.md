---
name: Course Access Control
description: How per-course expiry, blocking, and audit trail work in the MCQ app.
---

## Rule
`userSubjectPurchasesTable` has `expiresAt`, `isBlocked`, `blockedAt`, `blockedBy`. `courseAccessLogsTable` records every access change (assigned/revoked/block/unblock/set_expiry).

**Why:** Student app `purchased` field must reflect active access only — filtered by `!isBlocked && (!expiresAt || expiresAt > now)`. Raw purchases include expired/blocked rows too, so two separate passes are needed: one for `purchasedIds` (active), one for `accessStatus` per subject.

**How to apply:**
- Any route that checks `purchased` must load full purchases then filter for active ones.
- `GET /admin/students` returns `assignedSubjects` (not `purchasedSubjects`) with field `id` = subjectId (not `subjectId`), so the admin panel's `sub.id` works correctly for revoke.
- `accessStatus` is computed in JavaScript at query time (not stored in DB).
- Log entries are created by the API route for assign, revoke, block, unblock, set_expiry actions.
