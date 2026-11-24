/**
 * Home page content from the client design. Text lives here so it can be changed in one place.
 *
 * Images: paths under apps/web/public. To use the client's photos (exported from the PSD files as
 * JPG/PNG), put them in apps/web/public/site/ and set the path here, e.g. hero: '/site/hero.jpg'.
 * While a photo is `null`, a built-in brand graphic is shown instead.
 */
export const HOME_IMAGES = {
  hero: null as string | null, // two students with a laptop
  categoriesPerson: null as string | null, // the "WOW!!" photo above the categories
  features: null as string | null, // students at computers
  instructors: null as string | null, // instructor at a computer (red section)
  offerBanner: null as string | null, // "Offer of the month" banner background
  /** Student project images for "Student Project Showcase". The section is hidden while empty. */
  showcase: [] as string[],
};

/** Partner institute logos ("Trusted by more than 14+ institutes"). The section is hidden while empty. */
export const PARTNER_LOGOS: { name: string; logo: string }[] = [];

export const BENEFITS = [
  { title: 'Learn Multiple Courses from Expert Mentors', text: 'One subscription opens courses across design, development, marketing and AI, taught by working professionals.' },
  { title: 'Best Guidance and Support', text: 'Mentors review your assignments and projects, and live classes let you ask questions as you learn.' },
  { title: 'Affordable Learning Access', text: 'Plans that cost less than a single classroom course, with access on your phone and computer.' },
];

export const PATH_STEPS = [
  { title: 'Watch & Learn', text: 'Short, focused video lessons, tracked so your progress is real.' },
  { title: 'Practise & Test', text: 'Apply your knowledge through tasks, quizzes and module tests.' },
  { title: 'Get Reviewed', text: 'Mentors review your assignments and capstone and give feedback.' },
  { title: 'Get Certified', text: 'Pass the final exam to earn a certificate anyone can verify with a QR code.' },
];

export const FEATURES = [
  { title: 'Server-enforced progression', text: 'Modules, quizzes and exams unlock in order, so every certificate means the work was done.' },
  { title: 'Tamper-proof video tracking', text: 'Only genuinely watched video counts, with a personal watermark on every lesson.' },
  { title: 'Question banks & quizzes', text: 'Randomised questions, attempt limits and instant results after every module.' },
  { title: 'Live classes & batches', text: 'Join live sessions with your batch and watch the recordings later.' },
  { title: 'Dashboard analytics', text: 'See your progress, scores and next steps on one dashboard.' },
  { title: 'Verifiable certificates', text: 'PDF certificates with a QR code and a public verification page for employers.' },
];

/** Optional YouTube links for testimonial cards, by student name (reviews come from the database). */
export const TESTIMONIAL_VIDEOS: Record<string, string> = {};

export const INSTRUCTOR_POINTS = [
  'Expert-led learning & mentorship',
  'Recorded lessons: learn any time, anywhere',
  'Live interactive classes & webinars',
  'Quizzes, assessments & performance tracking',
  'Practical projects & assignments',
  'Portfolio development & career guidance',
  'Personalised reviews & feedback',
  'Certificate of course completion',
];

export const PLANS = [
  {
    name: 'Learner',
    tagline: 'Start Your Learning Journey',
    annual: 4999,
    twoYear: 8999,
    heading: 'Included features',
    features: ['Any 4 learning categories', 'Recorded video courses', 'Basic study materials', 'Basic progress tracking', 'Downloadable learning resources', 'Practice exercises & quizzes', 'Personal learning dashboard', 'Course completion certificates'],
    highlight: false,
  },
  {
    name: 'Innovator',
    tagline: 'Learn More. Practise More. Grow Faster.',
    annual: 6999,
    twoYear: 11999,
    heading: 'Everything in Learner +',
    features: ['Any 10 learning categories', 'Expanded course library', 'Complete study materials', 'Practical assignments & projects', 'Project submission & expert review', 'Live group classes', 'Selected workshops & webinars', 'Priority student support'],
    highlight: true,
  },
  {
    name: 'Master',
    tagline: 'Master Skills. Build Your Future.',
    annual: 11999,
    twoYear: 13999,
    heading: 'Everything in Innovator +',
    features: ['All learning categories', 'Complete eligible course library', 'All eligible new courses', 'Advanced project evaluation', 'Premium live classes & workshops', 'Personal 1:1 mentorship', 'Portfolio development', 'Career guidance'],
    highlight: false,
  },
];

export const FAQS = [
  { q: 'How do I enrol in a course?', a: 'Open the course, press Enrol Now and pay securely with Razorpay (UPI, cards, net banking). Your access starts straight after payment and a GST invoice is emailed to you.' },
  { q: 'Are courses live or recorded?', a: 'Every course has recorded lessons you can watch any time. Many courses also have live batches with scheduled classes; recordings are shared afterwards.' },
  { q: 'How long can I access a course?', a: 'For the access period shown on the course page. You can learn at your own pace on one phone and one computer.' },
  { q: 'How do I submit assignments?', a: 'Each module has an assignment you submit from the lesson page. A mentor reviews it; you need 80% of the marks to pass, otherwise you improve it and resubmit.' },
  { q: 'Will my work be reviewed?', a: 'Yes. Instructors review assignments and your capstone project and give written feedback.' },
  { q: 'How do I receive my certificate?', a: 'Pass the final exam after completing every module. The certificate is issued as a PDF with a QR code that employers can verify online.' },
  { q: 'Can I download course materials?', a: 'Yes, lesson notes and worksheets can be downloaded from each lesson. Videos stream securely and are not downloadable.' },
  { q: 'What if I need help or have a question?', a: 'Ask in your live class, message your mentor, or send an enquiry and our admissions team will call or WhatsApp you within one working day.' },
];
