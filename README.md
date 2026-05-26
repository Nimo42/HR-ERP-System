# Antbox HR-ERP

A full-stack HR & ERP web application covering the complete employee lifecycle — onboarding, attendance, leave, payroll, compliance, and offboarding — across three role levels.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js |
| Backend | Express / Next.js API routes |
| ORM | Prisma |
| Database | SQLite (upgradeable to PostgreSQL) |
| Auth | JWT (HTTP-only, SameSite=Strict cookies) |
| Face Verification | face-api.js (in-browser, 128-float embeddings) |

---

## Roles

The system has three role levels. No role can create accounts above or at its own level.

```
Admin (IT Owner)
  └── HR Manager
        └── Employee
```

### Admin
- Pre-seeded single account at system setup
- Does **not** track attendance or require face enrollment
- Dashboard: `/dashboard/it-owner`

### HR Manager
- Created by Admin
- Manages full employee lifecycle
- Subject to face-based attendance tracking
- Dashboard: `/dashboard/hr`

### Employee
- Created by HR Manager
- Scoped view — sees only their own data
- Dashboard: `/dashboard/employee`

---

## Login & Session Flow

1. Navigate to the ERP URL → lands on login page
2. Enter credentials
3. On success, backend signs a JWT and sets it as an HTTP-only cookie
   - Admin / HR sessions: **4 hours**
   - Employee sessions: **8 hours**
4. Role-based redirect to respective dashboard
5. **Enrollment gate**: HR Manager and Employee are hard-redirected to `/dashboard/enroll` if face not yet enrolled
6. **Password reset gate**: First-login accounts with a pending reset token are blocked from dashboard until password is changed

---

## Default Credentials

> ⚠️ Change all default passwords immediately after first login.

| Account | Email | Default Password |
|---------|-------|-----------------|
| Admin | `admin@antbox.com` | `Password@123` |
| Demo HR Manager | `priya@antbox.com` | `Password@123` |
| Any new HR / Employee | *(their email)* | `Password@123` |

### First Login for New HR / Employee Accounts

New accounts are added to the database immediately but **cannot log in directly** with the default password. Follow these steps:

1. Go to the login page and click **Forgot Password**
2. Enter the account's email address
3. Use the password reset link sent to set a new password
4. Log in normally with the new password

---

## Face Enrollment & Verification

Face verification replaces QR/password-based attendance. All processing happens **in-browser** — only a 128-dimension float array (embedding) is sent to the server. No photo ever leaves the device.

### Enrollment (One-Time)

Triggered automatically on first login for HR Manager and Employee.

1. Camera opens; face-api.js loads three models from `/public/models`:
   - `tiny_face_detector`
   - `face_landmark_68`
   - `face_recognition_net`
2. User looks **straight → slightly left → slightly right** (3 captures)
3. Three 128-float embeddings are averaged element-by-element on the backend
4. Result stored as `faceEmbedding` on the User record; `faceEnrolled` set to `true`
5. User is redirected to their dashboard

### Daily Attendance — Face Scan Flow

1. User opens the Attendance page and clicks **Check In / Check Out**
2. Camera opens + **blink liveness check** (EAR via face landmarks — prevents photo spoofing)
3. Live 128-float embedding generated in-browser
4. `POST /api/attendance` — backend fetches the stored embedding (identity from JWT, not scan payload)
5. Euclidean distance calculated:
   - `< 0.6` → match ✅
   - `>= 0.6` → rejected ❌
6. Clock toggles: open clock-in (no `clockOutTime`) → clock out; otherwise → clock in
   - **Late flag**: clock-in after 09:30
   - **Overtime flag**: session exceeds 9 hours
   - **Short-hours alert**: automated email sent to employee if total active time < 9h on clock-out
7. Multiple IN/OUT pairs per day are stored as separate `AttendanceLog` rows; total active time = sum of all completed sessions

**Security notes:**
- The JWT session determines whose attendance is recorded — not the face scan payload
- 3 consecutive failed face scans triggers an automatic HR notification
- Admin can manually clock HR Manager; HR Manager can manually clock Employee

---

## Feature Reference by Role

### Admin

| Feature | Details |
|---------|---------|
| Create HR Manager | Name, email, monthly salary → auto-generates `HR-XXXX` ID |
| View / Deactivate / Delete / Reactivate HR Managers | Full lifecycle management |
| Resend invite | Regenerates 24-hour reset token |
| Company profile | Org name, address, email, timezone |
| Departments | Create, rename, soft-delete |
| Office Locations | Addresses + optional CIDR IP range for attendance flagging |
| Working Hours | Standard required hours/day (default 9h) |
| Holiday Calendar | Public & company holidays (credited as paid hours in payroll) |
| Payroll gate | Review draft runs; **finalise** to lock and make payslips downloadable |
| Payslip breakdown | Gross, PF, ESI, TDS, LOP, Net Pay |
| Audit log | Filterable trail of leave requests, payroll runs, user creations, notifications; exportable as CSV/JSON |
| Org chart | Visual hierarchy of all employees, departments, and reporting relationships |

### HR Manager

| Feature | Details |
|---------|---------|
| Create Employee | Name, email, department, monthly salary → auto-generates `EMP-XXXX` ID |
| Edit Employee Profile | Department, manager, join date, probation end, emergency contact, remote eligibility |
| Deactivate Employee | Soft-delete; access removed but records preserved |
| Profile Edit Requests | Approve/reject employee-initiated changes to locked fields |
| View / manual clock / correct attendance | Full attendance management for all employees |
| Leave types | Create & configure (quota, carry-forward, advance notice, emergency flag) |
| Approve / reject leave requests | Employees notified in-app |
| Run month-end payroll | Calculates worked hours, LOP, PF (12%), ESI (0.75%), TDS; generates payslip HTML |
| Upload compliance policies | Optional read-receipt requirement |
| Track acknowledgements | Per-employee policy acknowledgement status |
| Warning letters | Verbal / Written / Show-Cause; stored against employee profile |
| Announcements | Company-wide or department-specific; supports rich text + file attachments |
| Pulse surveys | Single question, 1–5 scale, anonymous aggregated results |
| Org chart | View and manage full employee hierarchy |

### Employee

| Feature | Details |
|---------|---------|
| Clock in / out | Face scan; multiple sessions/day supported |
| View own attendance | Current month logs — times, location, late/overtime flags |
| Raise correction request | Submit wrong clock-time corrections for HR review |
| Apply for leave | Select type, date range, reason |
| View leave balance | Remaining days per leave type for current year |
| View payslips | Available after Admin finalises payroll run |
| Company directory | Browse names, departments, roles (no salary visibility) |
| View announcements | Company-wide + own department |
| Acknowledge policies | One-click acknowledgement for policies requiring read receipt |
| View warning letters | Any letters issued to them |
| Pulse surveys | Submit one 1–5 rating per active survey |
| Profile & settings | View personal details; submit change requests for locked fields |
| Bank details | View registered bank account (used for payroll) |
| Documents | View documents uploaded by HR (offer letter, ID proof, etc.) |
| In-app notifications | Leave actions, attendance corrections, manual clocks, payslips, probation reminders, surveys |

---

## Quick Permissions Matrix

| Action | Admin | HR Manager | Employee |
|--------|:-----:|:----------:|:--------:|
| Create HR Manager | ✅ | ❌ | ❌ |
| Create Employee | ❌ | ✅ | ❌ |
| Face enrollment required | ❌ | ✅ | ✅ |
| Clock in/out (own) | ❌ | ✅ (face) | ✅ (face) |
| Manual clock (others) | HR only | Employee only | ❌ |
| Approve leave | ❌ | ✅ | ❌ |
| Run payroll (draft) | ❌ | ✅ | ❌ |
| Finalise payroll | ✅ | ❌ | ❌ |
| Upload policies | ❌ | ✅ | ❌ |
| Issue warning letter | ❌ | ✅ | ❌ |
| View audit log | ✅ | ❌ | ❌ |
| System configuration | ✅ | ❌ | ❌ |
| View own payslip | ❌ | ✅ | ✅ |
| Post announcements | ❌ | ✅ | ❌ |

---

## Dashboard URLs

| Role | URL |
|------|-----|
| Admin | `/dashboard/it-owner` |
| HR Manager | `/dashboard/hr` |
| Employee | `/dashboard/employee` |
| Face Enrollment | `/dashboard/enroll` |
