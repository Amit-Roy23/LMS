/**
 * One-click demo accounts (seeded by apps/api/prisma/seed.ts). Each persona shows a
 * different part of the platform, so a reviewer can explore every state in seconds.
 */
export type DemoAccountKey =
  | 'admin'
  | 'instructor'
  | 'designer'
  | 'student1'
  | 'student2'
  | 'student3'
  | 'student4'
  | 'pending';

export interface DemoAccount {
  key: DemoAccountKey;
  label: string;
  persona: string;
  email: string;
  password: string;
  group: 'Staff' | 'Students';
  /** Tailwind classes for the avatar dot */
  tone: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    key: 'admin',
    label: 'Administrator',
    persona: 'Revenue, users, reports & full control',
    email: 'admin@creativeit.academy',
    password: 'Admin@123',
    group: 'Staff',
    tone: 'from-indigo-500 to-violet-500',
  },
  {
    key: 'instructor',
    label: 'Instructor',
    persona: 'Review queue, grading & quiz builder',
    email: 'instructor@creativeit.academy',
    password: 'Instructor@123',
    group: 'Staff',
    tone: 'from-sky-500 to-indigo-500',
  },
  {
    key: 'designer',
    label: 'Design Instructor',
    persona: 'Teaches UI/UX & Graphic Design courses',
    email: 'priya.design@creativeit.academy',
    password: 'Instructor@123',
    group: 'Staff',
    tone: 'from-pink-500 to-violet-500',
  },
  {
    key: 'student1',
    label: 'Learner · In progress',
    persona: 'Module 1 done, working through module 2',
    email: 'student1@creativeit.academy',
    password: 'Student@123',
    group: 'Students',
    tone: 'from-emerald-500 to-teal-500',
  },
  {
    key: 'student2',
    label: 'Graduate · Certified',
    persona: 'Completed course with a verified certificate',
    email: 'student2@creativeit.academy',
    password: 'Student@123',
    group: 'Students',
    tone: 'from-amber-500 to-orange-500',
  },
  {
    key: 'student3',
    label: 'Live batch learner',
    persona: 'Live classes, quiz retake, assignment in review',
    email: 'student3@creativeit.academy',
    password: 'Student@123',
    group: 'Students',
    tone: 'from-violet-500 to-fuchsia-500',
  },
  {
    key: 'student4',
    label: 'New learner',
    persona: 'Just started: quiz unlocks after the videos',
    email: 'student4@creativeit.academy',
    password: 'Student@123',
    group: 'Students',
    tone: 'from-sky-500 to-cyan-500',
  },
  {
    key: 'pending',
    label: 'Pending payment',
    persona: 'Enrolment awaiting payment: content locked',
    email: 'student_pending@creativeit.academy',
    password: 'Student@123',
    group: 'Students',
    tone: 'from-slate-400 to-slate-500',
  },
];

export function getDemoAccount(key: DemoAccountKey): DemoAccount | undefined {
  return DEMO_ACCOUNTS.find((a) => a.key === key);
}
