# ADSIGN Skill Academy: console guide

For main admins, office staff and instructors. Sign in at `/login`; the console opens at
`/admin/dashboard` and shows only the sections your role can use.

## Who can do what

| Task | Main admin (max 3) | Office staff | Instructor |
|---|:-:|:-:|:-:|
| Create and edit courses, modules, lessons, materials | ✔ | ✔ | ✔ own courses |
| Change prices, delete courses/modules/lessons/live classes | ✔ PIN + OTP | ✖ | ✖ |
| Live classes and batches | ✔ | ✔ | ✔ own courses |
| Grade assignments and projects, reset quiz attempts | ✔ | ✖ | ✔ own students |
| Students, enrolments, reports | ✔ all | ✔ all | ✔ own courses |
| Enquiries, admissions, notifications | ✔ | ✔ | ✖ |
| Payments & invoices | ✔ (refunds: PIN + OTP) | ✔ view | ✖ |
| Approve mobile number changes and instructor links | ✔ | view | ✖ |
| Website pages (Terms, Privacy, Refund, Contact) | ✔ | view | ✖ |
| SEO & analytics | ✔ | ✔ | ✖ |
| Website contact details, WhatsApp alert number | ✔ | view | ✖ |
| Users & roles, settings, revoke certificates | ✔ PIN + OTP | ✖ | ✖ |
| Activity log and undo | ✔ | ✖ | ✖ |

## Security PIN and OTP (main admins)

1. Open **My Security** and set a 4–6 digit PIN (you need your account password).
2. When you do a protected action (price, refund, deletion, role change), a box asks for the PIN,
   then a code sent to your phone or email. After that, protected actions work without asking
   again for 10 minutes.
3. Never share your PIN. Five wrong PINs lock it for 15 minutes.

## Daily work

- **Enquiries:** new leads from the website. Call or WhatsApp from the card, change the status
  (New → Contacted → Enrolled/Closed) and add follow-up notes. New enquiries are also emailed to the team.
- **Approvals:** students who changed their mobile number (already confirmed with an OTP) wait
  here. Check it is really them, then **Approve** or **Decline** with a reason; they get an email.
  New or changed instructor social links also wait here: tick the links to publish and press
  **Approve selected**, or **Decline**. Under **Live instructor links** a main admin can **Hide** any
  link that is already on the website.
- **Payments & invoices:** every payment with its GST invoice (download the PDF from the invoice
  number). Main admins can refund; course access is then suspended automatically.
- **Video activity:** who watched which lesson, on which device and network. Accounts seen on 3 or more
  networks in a day are highlighted as possible account sharing.
- **Review queue (instructors):** grade submitted assignments and projects with feedback. The pass mark
  is shown next to the grade box (80% of the marks unless the course says otherwise). A grade below the
  pass mark is sent back to the student as **Changes requested**, so they improve and resubmit.

## Courses, materials and live classes

Open **Courses** and press **Manage** on a course. The course editor has four tabs:

- **Curriculum & materials:** add modules and lessons, edit a lesson's title and summary, and press
  **Upload material** on a lesson to attach a PDF, slides, document, spreadsheet, image or ZIP. Students
  download materials through a private link that works only for them and expires after 15 minutes.
- **Pass marks & rules:** module test, mock test, assignment and final exam pass marks (80% by
  default), quiz attempts, video completion %, lesson order lock and watermark. Saving updates every
  test in the course.
- **Course details:** title, description, category, level, publish status, image and price (a price
  change needs a main admin's PIN + OTP).
- **Live classes:** schedule a class for a batch (topic, start time, length, Zoom/Meet/other link) and
  add the recording link afterwards. Students can join from 15 minutes before the start.

## Website pages, SEO and contact details

- **Website pages:** a main admin edits the wording of Terms & Conditions, Privacy Policy, Refund &
  Cancellation and the Contact page intro. Write in plain text: start a line with `## ` for a heading
  and `- ` for a bullet, wrap words in `**double stars**` for bold, and write links as
  `[text](/contact)`. Use **Preview** before saving. Every save is kept under **Versions**, and any
  earlier version can be restored.
- **SEO & analytics** (main admins and staff): set the title, description and share image for the
  home page, each main page, each course and each instructor, or tick **Hide from Google**. Paste the
  Google Search Console verification code and the Google Analytics 4, Google Ads and Meta Pixel IDs
  here; they take effect on the website within about a minute.
- **Website settings** (main admins): the email, phone, WhatsApp number, address and office hours shown
  on the website, and the **WhatsApp number that receives new-enquiry alerts** (+91 96813 86103 by
  default). Real WhatsApp messages start once a WhatsApp Business provider is connected (see the
  deployment guide); until then the alerts are recorded in **Notifications** and sent by email.

## Undoing mistakes (Activity log)

Every change in the console is recorded with the old and new values. A main admin can press **Undo** to:

- restore old field values (for example a lesson title a staff member changed by mistake);
- restore a deleted course, module or lesson (deleted items go to a trash, not away for ever);
- remove something created by mistake.

If the item was changed again later, the system warns you before overwriting the newer change.

## Students' devices

Students (including the demo students) can stay signed in on **one phone and one computer**. A new
browser asks for a one-time code first. Signing in on another device signs
out the older one, and only one video can play at a time, even across tabs of the same browser. Students see and sign out their devices on
their profile page. If a student loses a phone, staff can sign that device out from support.

## Instructor public profile

Instructors fill in **Public Profile** (headline, bio, skills, links) and tick "Show my profile
on the website". The profile appears on the Instructors page and on their course pages.

- **Photo:** press **Upload photo** (or **Replace photo**), choose a JPG, PNG or WebP image, drag and zoom
  to pick the square, then **Save photo**. It is saved at 512 × 512.
- **Links:** new or changed links show **Waiting for approval** until a main admin approves them in
  **Approvals**; removing a link takes effect at once. A main admin's own links go live straight away.

## Student IDs

Every student gets an ID such as **ADS-2026-000123** when they register (website sign-up, admission
form or payment). Students can sign in with the ID, their email or their mobile number.

## Help

The **Help** item in the console menu opens this guide.
