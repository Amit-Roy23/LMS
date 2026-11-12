# Acceptance testing checklist (UAT)

Test each item together, on a phone and on a computer. A phase is accepted when every item
passes or is recorded as an agreed follow-up. In demo mode the OTP is shown on screen; on the
live server it arrives by SMS or email.

Demo logins are on the sign-in page ("One-click demo accounts"). The main admin security PIN is
`2580` in the demo.

## Accounts & security

| # | Test | Steps | Expected | Pass? |
|---|---|---|---|---|
| 1 | Registration with OTP | Register → enter mobile → enter code | Account created; student ID like `ADS-2026-000123` after first admission | ☐ |
| 2 | One account per mobile | Register again with the same mobile | "This mobile number is already registered" | ☐ |
| 3 | New-device OTP | Sign in as your new student from another browser | Asked for a code before signing in | ☐ |
| 4 | Device limit | Sign in on a second computer | The first computer is signed out immediately | ☐ |
| 5 | Password reset by OTP | Forgot password → Code to mobile | New password works; code works only once | ☐ |
| 6 | Mobile number change | Student profile → Request a change → OTP | Shows "waiting for approval"; admin approves in Approvals; new number works | ☐ |

## Payments & invoices

| # | Test | Steps | Expected | Pass? |
|---|---|---|---|---|
| 7 | Checkout | Course page → Enrol → Pay | Course opens immediately after payment | ☐ |
| 8 | Live Razorpay (₹1 test course) | Pay with UPI on the live site | Razorpay popup; access granted only after the payment is verified | ☐ |
| 9 | GST invoice | Dashboard → Payments & receipts → GST invoice | PDF with invoice number, GSTIN, CGST+SGST or IGST; emailed too | ☐ |
| 10 | No access without payment | Open a lesson link of an unpaid course | Access denied | ☐ |
| 11 | Refund | Admin → Payments & invoices → Refund (PIN + OTP) | Payment refunded; course access suspended | ☐ |

## Learning

| # | Test | Steps | Expected | Pass? |
|---|---|---|---|---|
| 12 | Sequential videos | Try to open video 2 before finishing video 1 | Locked | ☐ |
| 13 | 70% module test | Score below, then above 70% | Next module stays locked, then unlocks | ☐ |
| 14 | Assignment review | Submit → instructor grades | Grade and feedback visible to the student | ☐ |
| 14a | 80% assignment rule | Instructor grades an assignment below 80% of its marks | Returned as "Changes requested"; student resubmits | ☐ |
| 14b | 80% mock test | Score below, then above 80% on the mock test | Fails, then passes | ☐ |
| 14c | Study materials | Open a lesson → Materials → download the PDF; copy the link into another browser after 15 minutes | Downloads for the student; the copied link no longer works | ☐ |
| 14d | Live class | Learner "Live Batch" → Schedule → "Demo: open practice room" | Join button is active; class opens | ☐ |
| 14e | Student ID | Register a new student | Gets an ID like ADS-2026-000123; can sign in with it | ☐ |
| 15 | Certificate | Learner "Graduate · Certified" → Certificates | Certificate downloads; QR / verify page confirms it | ☐ |

## Video protection

| # | Test | Steps | Expected | Pass? |
|---|---|---|---|---|
| 16 | Copied link | Copy the video request URL into another browser or site | Does not play | ☐ |
| 17 | Watermark | Play a lesson | Student name and ID float over the video | ☐ |
| 18 | One stream at a time | Play on a phone and a computer | Second device asks "Watch here instead?"; first one stops | ☐ |
| 19 | Viewing log | Admin → Video activity | Shows who watched what, device and network | ☐ |

## Console roles

| # | Test | Steps | Expected | Pass? |
|---|---|---|---|---|
| 20 | Price change protection | Admin → edit course price | PIN + OTP requested | ☐ |
| 21 | Staff limits | Sign in as Office Staff → try deleting a course / grading | Not available | ☐ |
| 22 | Undo a staff mistake | Admin → Activity log → Undo on the staff lesson edit | Lesson title restored | ☐ |
| 23 | Max 3 admins | Users & roles → add a 4th main admin | Refused | ☐ |
| 24 | Instructor scope | Sign in as Design Instructor | Sees only own courses, students and reports | ☐ |
| 24a | Upload material | Courses → Manage → lesson → Upload material | File listed on the lesson; student can download it | ☐ |
| 24b | Instructor photo | Instructor → Public Profile → Upload photo → crop → Save photo | Square photo on the public profile | ☐ |
| 24c | Link approval | Instructor adds a LinkedIn link → Admin → Approvals | Link hidden until approved, then live; admin can Hide it | ☐ |
| 24d | Help | Console → Help | Console guide opens | ☐ |

## Website

| # | Test | Steps | Expected | Pass? |
|---|---|---|---|---|
| 25 | Enquiry form | Home page "Talk to an advisor" and Contact page → send | Appears in Admin → Enquiries labelled "home page" / "contact page"; alert email and WhatsApp alert queued | ☐ |
| 26 | Instructor profiles | Instructors page → profile | Profile with courses; linked from the course page | ☐ |
| 27 | Policies | Footer → Terms, Privacy, Refund | Pages open (needed for Razorpay approval) | ☐ |
| 27a | Edit a policy | Admin → Website & Pages → Refund → edit → Save; then Versions → Restore | Website shows the new text within a minute; restore brings the old text back | ☐ |
| 28 | SEO | Open `/sitemap.xml` and share a course link on WhatsApp | Sitemap lists courses; link preview shows title and image | ☐ |
| 28a | SEO editor | SEO & Analytics → edit a course title; tick Hide from Google on another | Page title changes; hidden page drops out of the sitemap | ☐ |
| 29 | Mobile layout | Every page above on a phone | No sideways scrolling; buttons easy to tap | ☐ |

## Operations

| # | Test | Steps | Expected | Pass? |
|---|---|---|---|---|
| 30 | Backup | `scripts/backup/backup.sh db` | Dump created locally and in off-server storage | ☐ |
| 31 | Restore test | `scripts/backup/test-restore.sh` | "restore test ok" with row counts | ☐ |
