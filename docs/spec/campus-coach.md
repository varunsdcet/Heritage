# Campus Coach functional specification

Status: Phase 1 implementation baseline

Roles: student, instructor, admin, registrar, applicant, employer

## Purpose

Campus Coach implements the shared Ask Heritage capability described by the campus OS map. Phase 1 provides useful, deterministic, grounded answers from live records. It does not represent catalogue text as model output and does not execute consequential actions.

## Invariants

- Authentication is mandatory.
- Context is derived from session claims; clients cannot select an institution, account, student, instructor, applicant, or employer subject.
- A source must be accessible to the requesting role. Answers without sources are refused.
- Student context contains only the student's record, enrolled sections, own assignments, published grades, eligible schedule, and own notifications.
- Instructor context contains only assigned sections and aggregate class information; no unrestricted directory or unrelated gradebook access.
- Applicant and employer context is limited to their account-scoped portal records until dedicated domain models exist.
- Admin and registrar context may contain institution aggregates, not secrets or raw credentials.
- Questions containing likely government identifiers or credential secrets are rejected before storage.
- Phase 1 answers are `read_only`. They may link to an existing workflow but cannot mutate another domain.
- Each successful request is idempotent and persists one interaction, audit event, and outbox event in one transaction.
- History is visible only to the originating account within its institution.

## API

### `POST /ai/ask`

Headers:

- `Authorization: Bearer ...`
- `Idempotency-Key: <unique client key>`

Request:

```json
{
  "question": "What should I focus on today?",
  "contextPath": "/student"
}
```

Response:

```json
{
  "interactionId": "uuid",
  "role": "student",
  "tier": "read_only",
  "answer": "...",
  "sources": [
    {
      "id": "assignment:uuid",
      "title": "CS301 - Project 1",
      "uri": "/student/assignments/uuid"
    }
  ],
  "suggestedActions": [
    {
      "label": "Open assignments",
      "href": "/student/assignments"
    }
  ],
  "createdAt": "ISO-8601"
}
```

### `GET /ai/history`

Returns the current account's most recent interactions, newest first. Phase 1 returns at most 20 records.

## Supported Phase 1 intents

- role-aware capability/help summary;
- student priorities, assignments, schedule, courses, grades, and notifications;
- instructor teaching load and class priorities;
- admin/registrar institutional operations and pending approvals;
- applicant next steps from account-scoped portal records;
- employer placement-related next steps from account-scoped portal records.

When a question is outside the available context, the Coach states the limitation and links to the most appropriate existing workflow. It must not fabricate a policy, date, grade, balance, placement, or decision.

## Privacy and abuse controls

- Question length is 3-2,000 characters.
- Maximum 20 successful interactions per account in a rolling minute.
- Reject likely SIN, SSN, passport-number, password, access-token, or private-key content.
- Do not write rejected prompt content to interaction, audit, or outbox storage.
- Persist provider as `campus_grounding_v1` for Phase 1 so UI and audit screens do not imply an external model was used.

## Future provider boundary

Later model generation remains behind `packages/ai`. A provider receives only the already-authorized context bundle, must return citations from the supplied source IDs, and is rejected if it introduces unknown citations. Model failure falls back to the deterministic grounded response rather than returning uncited content.
