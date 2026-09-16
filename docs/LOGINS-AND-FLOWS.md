# MyHeritage — Logins, URLs & Module Flows

Live campus OS map: every role, login, URL, and end-to-end flow.

**Password for all demo accounts:** `Heritage!2026`

---

## Base URLs (live)

| Service | URL |
|---------|-----|
| Web | http://46.202.163.202:3000 |
| Web (nginx) | http://46.202.163.202 |
| API | http://46.202.163.202:4000 |
| API docs | http://46.202.163.202:4000/api/docs |
| Login | http://46.202.163.202:3000/login |
| Forgot / Reset | http://46.202.163.202:3000/reset |
| Role select | http://46.202.163.202:3000/role-select |
| Screens map | http://46.202.163.202:3000/screens |

---

## Total logins

| Role | Name | Email | Lands on |
|------|------|-------|----------|
| **Admin** | Aisha Khan | `admin@heritage.edu` | `/admin` |
| **Teacher** | Elena Vance | `vance.instructor@heritage.edu` | `/instructor` |
| **Teacher** | James Pendelton | `pendelton@heritage.edu` | `/instructor` |
| **Student** | Marcus Vance | `marcus.vance@heritage.edu` | `/student` |
| **Student** | Priya Sandhu | `priya.sandhu@heritage.edu` | `/student` |
| **Student** | Daniel Okafor | `daniel.okafor@heritage.edu` | `/student` |
| **Student** | Jordan Lee | `jordan.lee@heritage.edu` | `/student` |
| **Student** | Mei Chen | `mei.chen@heritage.edu` | `/student` |
| **Student** | Lucas Moreau | `lucas.moreau@heritage.edu` | `/student` |
| **Student** | Fatima Hassan | `fatima.hassan@heritage.edu` | `/student` |
| **Applicant** | Nora Reyes | `nora.reyes@applicant.heritage.edu` | `/applicant` |
| **Employer** | Sam Okello | `sam.okello@fraserhealth.partner` | `/employer` |

---

## Master flow (Admin create → other logins)

```text
1. Login admin@heritage.edu → /admin
2. Users create → /admin/users/create  (POST /admin/users)
      → welcome mail (Humanitix) + notification
3. Sections create → /admin/sections   (POST /admin/sections)
4. Enrol student → /admin/enrolments   (POST /admin/enrolments)
5. Assignment optional → POST /admin/assignments
6. New teacher login → /instructor  (sees sections in bootstrap)
7. New student login → /student     (sees courses / grades / assignments)
```

Forgot password: `/login` → forgot → mail → `/reset?token=…` → new password → role home.

---

## 1) Admin — every tab / module

**Home:** http://46.202.163.202:3000/admin  
**All screens:** `/admin/all`

| Module | URL | Flow |
|--------|-----|------|
| Overview | `/admin` | Campus ops home |
| Users / create | `/admin/users`, `/admin/users/create` | Create user → mail + login ready |
| Sections | `/admin/sections` | Create section + assign instructor |
| Enrolments | `/admin/enrolments` | Link student ↔ section |
| Approvals | `/admin/approvals` | Decide / apply approvals |
| Admissions | `/admin/admissions` → `/admin/f/ad-01…` | Application queue → decision → offer |
| Programs / courses / terms | `/admin/programs`, `/admin/courses`, `/admin/terms` | Academic catalogue |
| Schedule | `/admin/schedule` → `/admin/f/ac-10-master-scheduling` | Master schedule |
| Students / Student 360 | `/admin/students`, `/admin/f/rg-01-student-360` | Student record |
| Finance / payments / refunds | `/admin/finance`, `/admin/payments`, `/admin/refunds` | Money ops |
| Practicum / employers | `/admin/practicum`, `/admin/f/pr-02…`, `/admin/f/pr-10…` | Sites + employer portal (admin view) |
| AI ops | `/admin/ai`, `/admin/ai/ask` | AI dashboards + Ask Heritage |
| Analytics | `/admin/analytics` | Funnels / KPIs |
| Audit / compliance / security | `/admin/audit`, `/admin/compliance`, `/admin/security` | Governance |
| Labs / CRM / records / transcripts | `/admin/labs`, `/admin/crm`, `/admin/records`, `/admin/transcripts` | Domain hubs |
| Notifications / calendar / search | `/admin/notifications`, `/admin/calendar`, `/admin/search` | Cross-cutting |
| Platform / integrations / settings | `/admin/platform`, `/admin/integrations`, `/admin/settings` | Platform |
| Help / profile | `/admin/help`, `/admin/profile` | Support |

**Admin creates → others use:** users, sections, enrolments, admissions decisions, practicum partners.

---

## 2) Teacher (Instructor)

**Home:** http://46.202.163.202:3000/instructor  
**Demo:** `vance.instructor@heritage.edu`

| Tab | URL | Flow |
|-----|-----|------|
| Home | `/instructor` | Bootstrap sections |
| Sections | `/instructor/sections` | Teaching load |
| Roster | `/instructor/roster` | Class list |
| Attendance | `/instructor/attendance` | Mark → Submit & Finalize |
| Gradebook | `/instructor/gradebook` | Enter / publish grades |
| Assessments / submissions | `/instructor/assessments`, `/instructor/submissions` | Work + grading |
| Announcements | `/instructor/announcements` | Class posts |
| Lectures / labs / modules | `/instructor/lectures`, `/instructor/labs`, `/instructor/modules` | Content |
| Studio | `/instructor/studio` | AI course studio |
| Calendar / messages / notifications | `/instructor/calendar`, `/instructor/messages`, `/instructor/notifications` | Comm |
| Profile / bio | `/instructor/profile`, `/instructor/f/t02-profile-biography` | Faculty profile |
| Search / Ask / All | `/instructor/search`, `/instructor/ask`, `/instructor/all` | Find + AI |

**Depends on admin:** section + enrolments must exist first.

---

## 3) Student

**Home:** http://46.202.163.202:3000/student  
**Demo:** `marcus.vance@heritage.edu`

| Tab | URL | Flow |
|-----|-----|------|
| Home | `/student` | Dashboard |
| Courses | `/student/courses` | Enrolments from admin |
| Assignments | `/student/assignments` | Upload files → submit |
| Grades | `/student/grades` | Published grade items |
| Calendar / schedule | `/student/calendar` | Deadlines |
| Attendance | `/student/attendance` | Presence view |
| Fees | `/student/fees` | Balance / payments |
| Advising / holds / success | `/student/advising`, `/student/holds`, `/student/success` | Student services |
| Documents / library | `/student/documents`, `/student/library` | Docs + loans |
| Lectures / labs / modules / assessments | `/student/lectures`, `/student/labs`, `/student/modules`, `/student/assessments` | Learning |
| Announcements / messages / notifications | `/student/announcements`, `/student/messages`, `/student/notifications` | Comm |
| Profile | `/student/profile` | Preferences / change requests |
| Search / Ask / All | `/student/search`, `/student/ask`, `/student/all` | Find + AI |

**Depends on admin:** enrolments. **Depends on teacher:** attendance + grades publish.

---

## 4) Applicant

**Home:** http://46.202.163.202:3000/applicant  
**Demo:** `nora.reyes@applicant.heritage.edu`

| Tab | URL | Flow |
|-----|-----|------|
| Home | `/applicant` | Status + next steps |
| Application | `/applicant/application` | Save progress → Submit |
| Documents | `/applicant/documents` | Upload missing docs |
| Requirements / status / interview | `/applicant/f/ap-03…`, `/applicant/f/ap-06…`, `/applicant/f/ap-05…` | Packet + interview |
| Offers | `/applicant/offers` | Accept / decline offer |
| Contract / LOA / payment / onboarding | `/applicant/f/ap-08…` → `ap-11` | Post-offer |
| Timeline / messages | `/applicant/timeline`, `/applicant/messages` | History + admissions mail |
| Ask / Search / All | `/applicant/ask`, `/applicant/search`, `/applicant/all` | AI + find |
| AI drawer | `/applicant/f/ap-12-applicant-ai-drawer` | Same Ask Heritage |

**Admin link:** `/admin/admissions` queue uses the same admissions domain.

---

## 5) Employer

**Home:** http://46.202.163.202:3000/employer  
**Demo:** `sam.okello@fraserhealth.partner`

| Tab | URL | Flow |
|-----|-----|------|
| Home | `/employer` | Active placements + pending work |
| Placements | `/employer/placements` | Students at site (e.g. Mei, Fatima) |
| Hours | `/employer/hours` | Approve pending hours |
| Evaluations | `/employer/evaluations` | Submit clinical eval |
| Agreements | `/employer/agreements` | MOU / affiliation |
| Profile | `/employer/profile` | Org + contact |
| Ask / Search / All | `/employer/ask`, `/employer/search`, `/employer/all` | AI + find |

**Admin link:** `/admin/practicum` + `/admin/f/pr-02-employers-registry` + `/admin/f/pr-10-employer-portal`.

---

## Cross-cutting (every role)

| Feature | Student | Teacher | Admin | Applicant | Employer |
|---------|---------|---------|-------|-----------|----------|
| Ask Heritage | `/student/ask` | `/instructor/ask` | `/admin/ai/ask` | `/applicant/ask` | `/employer/ask` |
| Search | `/student/search` | `/instructor/search` | `/admin/search` | `/applicant/search` | `/employer/search` |
| All screens | `/student/all` | `/instructor/all` | `/admin/all` | `/applicant/all` | `/employer/all` |

API: `POST /ai/ask`, `GET /search?q=`

---

## End-to-end (nothing missed)

```text
Auth
  login / forgot / reset / role-select
       │
Admin create
  users → sections → enrolments → (admissions / practicum)
       │
       ├─ Teacher: attendance → gradebook → announcements
       ├─ Student: courses → assignments submit → grades / fees
       ├─ Applicant: application → documents → offer accept
       └─ Employer: placements → hours approve → evaluation
       │
Shared: Search + Ask Heritage (5 roles) + notifications/mail
```

---

## Catalog / smoke status

| Check | Status |
|-------|--------|
| Admin pages | 185 |
| Instructor pages | 95 |
| Student pages | 36 |
| Applicant pages | 17 |
| Employer pages | 9 |
| `screens.ts` catalog | 386 |
| Orphans / missing pages | 0 / 0 |
| Last platform smoke | **59 PASS / 0 FAIL** |
