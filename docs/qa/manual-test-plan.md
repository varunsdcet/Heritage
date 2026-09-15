# Heritage Manual QA Test Plan

Version: 1.0
Prepared: 2026-09-15
Execution sheet (100 cases): [`manual-test-cases.csv`](./manual-test-cases.csv)

Automated critical-journey runner: [`../../tools/qa/full-journey.mjs`](../../tools/qa/full-journey.mjs)

## 1. Purpose

This plan covers manual testing of the principal Heritage user journeys requested for:

- authentication and role-based navigation;
- user creation;
- course and section creation;
- assigning students to sections;
- student and instructor course views;
- grade publication and approval workflow;
- file upload and file lifecycle;
- deletion and archival;
- search;
- profiles; and
- notifications.

The test pack is grounded in the current repository. A generated route or visible button is not treated as proof that the underlying capability exists.

## 2. Scope and source-of-truth warning

`tools/register/register_v2.csv` currently registers only `SH-01`, `SH-12`, `ST-07`, `ST-21`, `IN-07`, and `MB-08`. Tests for course administration, uploads, deletion, joining classes, profiles, search, and notifications are useful discovery tests, but those capabilities require register and contract coverage before their future pass criteria can become authoritative.

Each test has one of these support labels:

| Label | Meaning |
|---|---|
| `READY` | A real UI/API path exists and the test can be executed now. |
| `PARTIAL` | Some behavior exists, but the test is expected to expose a known gap or incomplete workflow. |
| `SPEC-REQUIRED` | No complete implementation or approved contract exists. Execute only as a discovery test; do not reinterpret a failure as a regression. |

## 3. Current test environment

| Component | Local value |
|---|---|
| Web | `http://localhost:3100` |
| API | `http://localhost:4100` |
| API documentation | `http://localhost:4100/api/docs` |
| Database | `heritage_codex_local` |
| Worker | Outbox relay process running locally |

The port values above describe the current local session. Testers should replace them with the target environment values when testing another deployment.

### Seed accounts

| Role | Email | Password |
|---|---|---|
| Student | `marcus.vance@heritage.edu` | `Heritage!2026` |
| Instructor | `vance.instructor@heritage.edu` | `Heritage!2026` |
| Admin/registrar | `admin@heritage.edu` | `Heritage!2026` |

Never use these credentials in a production environment.

## 4. Test-data rules

1. Assign a run identifier such as `RUN-20260915-01` before execution.
2. Use unique values derived from that identifier:
   - student: `qa.student+<RUN_ID>@heritage.edu`;
   - instructor: `qa.instructor+<RUN_ID>@heritage.edu`;
   - course code: `QA<HHMM>`;
   - section code: `<COURSE>-01`.
3. Do not reseed a shared or production database. The seed script deletes existing data.
4. Deletion is not implemented. Test records must remain in the dedicated QA database or be removed only by resetting that disposable database.
5. Never upload real personal, financial, medical, immigration, or government-ID data. Use synthetic fixtures only.

Suggested synthetic files for future upload testing:

- `valid-transcript.pdf`, under 1 MB;
- `valid-profile.png`, under 1 MB;
- `oversize-document.pdf`, larger than the configured limit;
- `wrong-extension.exe` containing harmless text;
- `double-extension.pdf.exe` containing harmless text;
- `empty.pdf`, zero bytes; and
- `unicode name – QA.pdf`.

## 5. Evidence and result recording

For every executed case, record:

- environment and build/commit;
- tester and timestamp;
- exact role/account;
- test data used;
- actual result;
- `PASS`, `FAIL`, `BLOCKED`, or `NOT RUN`;
- screenshot or screen recording for UI failures;
- request, response status, correlation ID, and sanitized body for API failures; and
- defect ID and severity when applicable.

Sensitive values such as passwords and access tokens must not appear in evidence.

## 6. Critical end-to-end journeys

### JNY-001 — Admin provisions a class and enrols a student

Priority: P0
Support: `READY`

Preconditions:

- A unique run identifier is available.
- Admin, instructor, and student test accounts do not already exist for the run.

Steps:

1. Sign in as the admin.
2. Open `/admin/users/create` and create a new instructor.
3. Create a new student with a unique email and student number.
4. Open `/admin/sections/create`.
5. Enter a new course code/title, unique section code, the new instructor email, credits, and term.
6. Select **Create & assign**.
7. Open `/admin/enrolments`.
8. Select the new section and enrol the new student.
9. Sign out and sign in as the instructor.
10. Verify the section appears in the instructor's courses/sections and that a section-assignment notification exists.
11. Sign out and sign in as the student.
12. Verify the course appears in the student's courses and that an enrolment notification exists.

Expected result:

- Each creation completes once and returns a clear confirmation.
- The instructor sees only sections assigned to them.
- The student sees only sections in which they are enrolled.
- Instructor and student receive the correct notifications.
- Refreshing each page preserves the new records.

### JNY-002 — Instructor grade publication and admin approval

Priority: P0
Support: `PARTIAL`

Steps:

1. Sign in as the assigned instructor and open `/instructor/gradebook`.
2. Select the relevant section.
3. Enter a valid draft score and save it.
4. Submit the draft grade for approval.
5. Sign in as admin/registrar and open `/admin/approvals`.
6. Review and approve the publication request.
7. Apply the approved request.
8. Sign in as the affected student and open `/student/grades`.
9. Verify the published grade and notification.

Expected result:

- The instructor can edit only their own section.
- The grade remains hidden from the student until approval is applied.
- Approval and application are each performed once and are auditable.
- The student sees the published grade and one notification after application.

Known baseline blockers:

- The gradebook UI does not currently provide score editing.
- The approval UI does not call the dedicated decide/apply endpoints.

### JNY-003 — Student asks about a published grade

Priority: P1
Support: `PARTIAL`

Steps:

1. Sign in as a student who has a published grade.
2. Open `/student/grades`.
3. Select **Ask about this grade**.
4. Enter a unique subject and question and submit it.
5. Verify a success confirmation and one message thread.
6. Sign in as the assigned instructor.
7. Open messages/notifications and verify the question is visible once.

Expected result:

- Only the owner of the published grade can create the question.
- The thread contains the student and assigned instructor.
- The instructor receives one notification.
- Refreshing or double-clicking does not create duplicate messages.

### JNY-004 — Search-to-record navigation

Priority: P1
Support: `PARTIAL`

Steps:

1. Sign in as each supported role in turn.
2. Search by full course code, partial title, person name, mixed case, and an unknown value.
3. Open a returned result.
4. Use Back and repeat the search.

Expected result:

- Results are institution-scoped and authorized for the current role.
- Search text is matched consistently and empty searches reveal no data.
- Selecting a result opens the correct record, not a generic unrelated screen.

Known baseline risk: the API currently returns people and email addresses to any authenticated role, while some header search palettes use static catalogue data instead of the API.

### JNY-005 — File lifecycle

Priority: P1
Support: `SPEC-REQUIRED`

Proposed future flow:

1. Open the authorized document/resource screen.
2. Select a valid synthetic file.
3. Upload it and verify progress, completion, persisted metadata, authorization, audit, and outbox records.
4. Download and compare the content.
5. Replace or version the file.
6. Archive/delete it with confirmation.
7. Verify unauthorized roles cannot view, download, replace, or delete it.

Current baseline expectation: no real multipart/file upload or download API exists. Visual upload areas must not report a successful persistent upload.

## 7. Functional coverage summary

| Area | Current implementation | Manual-test focus |
|---|---|---|
| Sign in | Partial | Role routing, invalid credentials, session behavior, MFA gap |
| Create users | API-backed admin UI | Validation, duplicates, authorization, notification |
| Create courses/classes | Course and section created together | Persistence, duplicate section, valid instructor, term behavior |
| Assign students | Admin enrolment UI/API | Duplicate enrolment, wrong account type, visibility, notification |
| Join class | No student self-join contract/API | Confirm capability is absent; obtain product requirements |
| Grade workflow | Partial dedicated APIs | Ownership, draft confidentiality, atomic approval, notification |
| Upload files | Visual shells only | Prevent false success; specify security and persistence tests |
| Delete/archive | No product delete endpoints | Confirm unavailable; specify permissions, dependencies, audit |
| Search | API plus static UI palettes | Role privacy, institution scope, navigation, special input |
| Profile | Mostly read-only generic views | Identity, role isolation, missing edit/persistence workflow |
| Notifications | Read-only list | Recipient isolation, ordering, duplicates, missing read/delete actions |

## 8. Non-functional checks to repeat across journeys

### Authorization and isolation

- Repeat every admin mutation as student and instructor; expect `403`.
- Try direct URLs rather than relying only on hidden navigation.
- Use IDs belonging to another instructor, student, section, and institution where a safe QA fixture exists.
- Confirm error messages do not reveal whether cross-tenant records exist.

### Validation and error handling

- Test blank, whitespace-only, minimum, maximum, Unicode, duplicate, and malformed input.
- Double-click every consequential submit button.
- Refresh during and after submission.
- Simulate API unavailability and slow responses.
- Verify the UI distinguishes validation, authorization, not-found, conflict, and server errors.

### Accessibility and responsive behavior

- Complete critical journeys with keyboard only.
- Verify visible focus, correct label association, logical tab order, and readable error announcements.
- Check desktop and narrow/mobile viewport layouts.
- Zoom to 200% and verify no critical content or actions are lost.

### Audit and event verification

For each successful mutation, verify in a safe QA database that:

- the domain write, audit event, and outbox event use the same institution;
- the actual acting account is recorded;
- sensitive values are absent from before/after payloads;
- one user action produces one logical event; and
- failed mutations leave no partial domain, audit, or outbox records.

## 9. Entry and exit criteria

Entry criteria:

- Target commit/build is recorded.
- Database is disposable or has an approved cleanup approach.
- Required accounts and cross-role test data exist.
- Web, API, database, and worker health checks pass.

Exit criteria for a release candidate:

- All P0 `READY` cases pass.
- No unresolved critical/high authorization, institution-isolation, draft-grade, or audit/outbox defects remain.
- Every `PARTIAL` failure is linked to an accepted ticket.
- Every requested `SPEC-REQUIRED` capability has either an approved register/contract ticket or is explicitly out of release scope.
- Evidence is attached and retests are complete.

## 10. Automated critical-journey execution

With the local API, web app, worker, and dedicated QA database running:

```bash
node tools/qa/full-journey.mjs
```

Optional environment variables:

```bash
QA_API_URL=http://127.0.0.1:4100 \
QA_WEB_URL=http://127.0.0.1:3100 \
QA_RUN_ID=unique-run-id \
QA_PASSWORD='<test-account-password>' \
node tools/qa/full-journey.mjs
```

Result meanings:

- `PASS`: current behavior met the automated assertion.
- `FAIL`: an unexpected regression or setup failure occurred.
- `XFAIL`: a known product defect was reproduced.
- `XPASS`: a previously known defect did not reproduce and should be reviewed for closure.
- `GAP`: the capability has no approved complete implementation and needs a register/contract ticket.

The journey creates uniquely named synthetic users, a course, a section, an enrolment, an approval, a message, notifications, audit rows, and outbox rows. Run it only against a disposable QA database. Reseed that database before rerunning the grade-publication segment because the available seeded draft is intentionally published during the journey.
