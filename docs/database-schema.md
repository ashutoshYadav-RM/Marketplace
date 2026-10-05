# Database schema

23 tables, defined in `backend/app/models/*.py` (each file documents *why*,
not just the columns — read those first). This doc is the quick-reference map
of relationships; `backend/alembic/versions/0001_initial.py` is the
authoritative DDL.

## Identity & profile

- **users** — mirrors Supabase `auth.users` (`id` is the same UUID). `role`
  is `student | admin | super_admin`, checked server-side on every request.
- **profiles** (1:1 `users`) — cached counters (`xp_total`, streaks,
  `questions_attempted`, etc.) kept in sync transactionally by the services
  that write attempts/XP. Source of truth is always the ledger tables below;
  this exists purely so the dashboard is a single cheap lookup.

## Content hierarchy

- **courses** → **subjects** → **topics** (each with `is_published`,
  `order_index`). Fully admin-defined, no hardcoded exam names anywhere in
  the schema.
- **questions** — belongs to course/subject/topic (+ optional `exam_id`,
  `year`). Inline `option_a..d` + `correct_option` (no separate options
  table — see the docstring in `models/question.py` for why). `question_type`
  is a free string (`practice | pyq | mock`, extensible) rather than a DB
  enum, so new types don't need a migration.
- **tags**, **question_tags** — many-to-many labels on questions.

## Exams & notifications

- **exams** — a followable exam (optionally linked to a `course`).
- **exam_events** — dated milestones (application window, admit card, exam
  date, result...) — this *is* the admin-managed notification content.
- **user_exam_follows** — who follows which exam, with a
  `notifications_enabled` toggle.

## Tests (mock + PYQ, unified)

- **tests** — `test_type` distinguishes `mock` from `pyq`; PYQ rows also
  carry `pyq_year` / `pyq_paper_label` for the Exam → Year → Paper browsing
  hierarchy. One model, one set of CRUD/attempt endpoints, for both.
- **test_sections** — named sections within a test (e.g. "Quant", "Reasoning").
- **test_questions** — join table: which questions, in what order/section,
  at what marks/negative-marks (can override the test default per question).
- **test_attempts** — one student's attempt at a test: status, score,
  correct/incorrect/skipped counts, timing. Individual question responses are
  **not** duplicated here — they live in `attempts` (next section), linked
  back via `test_attempt_id`.

## The attempt ledger (powers all analytics)

- **attempts** — every question a student has ever answered, whether
  standalone practice or inside a test (`test_attempt_id` set for the
  latter). Denormalizes `difficulty`/`question_type` at write time so
  analytics queries don't need to join `questions`. **Never deleted.**
  Every dashboard number — progress graphs, strong/weak areas, improvement,
  recommendations, subject/topic performance, XP — is computed from this one
  table.

## Gamification

- **xp_transactions** — append-only XP ledger (`Profile.xp_total` is a
  cached sum of this). Weekly/monthly leaderboards sum this table filtered
  by `created_at` rather than needing a separate snapshot.
- **achievements** — admin/seed-defined rules (`criteria_type` +
  `criteria_value`, e.g. `questions_attempted >= 100`).
- **user_achievements** — earned achievements per user.

## Notifications, moderation, admin

- **notifications** — persisted per-user notifications (achievement
  unlocked, system messages). Exam-event reminders are computed live from
  `exam_events` + `user_exam_follows` rather than fanned out into rows here.
- **reports** — "Report Question" submissions from students, with an admin
  review workflow (`open → reviewed → resolved`).
- **admin_activity_logs** — audit trail of admin create/update/delete/bulk
  actions.
- **platform_settings** — key/value overrides for scoring/XP weights,
  analytics thresholds, and leaderboard rules, read through
  `services/settings_service.py` with hardcoded fallbacks. Lets the entire
  scoring/gamification/analytics architecture be tuned without a redeploy.

## Deliberately not tables

- **No leaderboard/ranking snapshot table.** Leaderboards are computed live
  from `xp_transactions` / `test_attempts` with indexed queries — see the
  docstring in `services/leaderboard_service.py` for the exact tradeoff and
  what to add if/when scale requires a materialized cache.
- **No separate `answers` table.** Test-question responses are `attempts`
  rows (`test_attempt_id` set) — one ledger, not two.
- **No separate `question_options` table.** Every question in scope has a
  fixed 4-option shape; inline columns avoid a join on the hottest read path.
