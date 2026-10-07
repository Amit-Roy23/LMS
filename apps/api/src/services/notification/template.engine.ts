export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderTemplate(
  template: string,
  variables: Record<string, any>,
  options: { isHtml?: boolean } = { isHtml: false }
): string {
  if (!template) return '';

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const val = variables[key];
    if (val === undefined || val === null) {
      return '';
    }
    const strVal = String(val);
    return options.isHtml ? escapeHtml(strVal) : strVal;
  });
}

/**
 * Maps named variables to positional WhatsApp template parameters ({{1}}, {{2}}, etc.)
 * according to Meta WhatsApp Cloud API template specs.
 */
export function mapVariablesToPositionalParams(
  variables: Record<string, any>,
  keysOrder: string[]
): { type: string; text: string }[] {
  return keysOrder.map((key) => ({
    type: 'text',
    text: String(variables[key] ?? ''),
  }));
}

export interface DefaultNotificationTemplate {
  key: string;
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS';
  locale: 'en' | 'bn';
  subject?: string;
  body: string;
}

export const SEED_TEMPLATES: DefaultNotificationTemplate[] = [
  // 1. Registration Confirmation (English)
  {
    key: 'registration_confirmation',
    channel: 'EMAIL',
    locale: 'en',
    subject: 'Admission Confirmed: {{courseTitle}} - Online Creative & IT Academy',
    body: `<h2>Congratulations {{studentName}}!</h2>
<p>Your payment of <strong>{{amount}} {{currency}}</strong> for <strong>{{courseTitle}}</strong> ({{mode}} Mode) has been received and verified.</p>
<p><strong>Order Summary:</strong><br/>
• Course: {{courseTitle}}<br/>
• Batch: {{batchName}}<br/>
• Delivery Mode: {{mode}}<br/>
• Payment ID: {{paymentId}}<br/>
• Admission Status: Confirmed</p>
<p>You can access your admission receipt here: <a href="{{receiptUrl}}">{{receiptUrl}}</a></p>
<p>Your student account credentials have been dispatched in a separate notification.</p>
<p>Best regards,<br/>Online Creative & IT Academy Team</p>`,
  },
  {
    key: 'registration_confirmation',
    channel: 'WHATSAPP',
    locale: 'en',
    body: `🎉 *Admission Confirmed: {{courseTitle}}*

Hello {{studentName}},
Your payment of *{{amount}} {{currency}}* for *{{courseTitle}}* ({{mode}} Mode) was successful!

*Details:*
• Batch: {{batchName}}
• Payment Ref: {{paymentId}}
• Receipt: {{receiptUrl}}

Your login credentials have been sent. Welcome to Online Creative & IT Academy!`,
  },
  {
    key: 'registration_confirmation',
    channel: 'SMS',
    locale: 'en',
    body: `Creative & IT Academy: Hi {{studentName}}, admission confirmed for {{courseTitle}} ({{mode}}). Fee: {{amount}} {{currency}}. Receipt: {{receiptUrl}}`,
  },

  // 1. Registration Confirmation (Bengali - Marked for Client Review)
  {
    key: 'registration_confirmation',
    channel: 'EMAIL',
    locale: 'bn',
    subject: 'ভর্তি নিশ্চিতকরণ: {{courseTitle}} - অনলাইন ক্রিয়েটিভ অ্যান্ড আইটি একাডেমি',
    body: `<h2>অভিনন্দন {{studentName}}!</h2>
<p><strong>{{courseTitle}}</strong> কোর্সের জন্য আপনার <strong>{{amount}} {{currency}}</strong> ফি সফলভাবে গৃহীত হয়েছে।</p>
<p><strong>কোর্সের বিবরণ:</strong><br/>
• কোর্স: {{courseTitle}}<br/>
• ব্যাচ: {{batchName}}<br/>
• মোড: {{mode}}<br/>
• পেমেন্ট আইডি: {{paymentId}}</p>
<p>মানি রিসিট ডাউনলোড করুন: <a href="{{receiptUrl}}">{{receiptUrl}}</a></p>
<p>আপনার স্টুডেন্ট অ্যাকাউন্টের বিবরণ পৃথক বার্তায় পাঠানো হয়েছে।</p>
<p>ধন্যবাদান্তে,<br/>অনলাইন ক্রিয়েটিভ অ্যান্ড আইটি একাডেমি</p>`,
  },
  {
    key: 'registration_confirmation',
    channel: 'WHATSAPP',
    locale: 'bn',
    body: `🎉 *ভর্তি নিশ্চিত হয়েছে: {{courseTitle}}*

প্রিয় {{studentName}},
{{courseTitle}} কোর্সের জন্য আপনার {{amount}} {{currency}} পেমেন্ট সফলভাবে গ্রহণ করা হয়েছে।

*বিবরণ:*
• ব্যাচ: {{batchName}}
• পেমেন্ট আইডি: {{paymentId}}
• রিসিট: {{receiptUrl}}

অনলাইন ক্রিয়েটিভ অ্যান্ড আইটি একাডেমিতে আপনাকে স্বাগতম!`,
  },

  // 2. Account Credentials (English)
  {
    key: 'account_credentials',
    channel: 'EMAIL',
    locale: 'en',
    subject: 'Your Student Portal Access & Credentials - Creative & IT Academy',
    body: `<h2>Welcome to Online Creative & IT Academy</h2>
<p>Hello {{studentName}},</p>
<p>Your personalized Student LMS account is ready with your official Student ID:</p>
<div style="background:#f1f5f9;padding:16px;border-radius:8px;font-family:monospace;">
  <p><strong>Student ID (User ID):</strong> {{studentId}}</p>
  <p><strong>Registered Email:</strong> {{email}}</p>
  <p><strong>Login Portal:</strong> <a href="{{loginUrl}}">{{loginUrl}}</a></p>
  {{#if tempPassword}}
  <p><strong>Temporary Password:</strong> {{tempPassword}}</p>
  <p><em>(You will be prompted to choose a new secure password on first sign-in)</em></p>
  {{/if}}
  {{#if setupUrl}}
  <p><strong>Set Your Password Link:</strong> <a href="{{setupUrl}}">{{setupUrl}}</a></p>
  <p><em>(This link is single-use and expires in 72 hours)</em></p>
  {{/if}}
</div>
<p>Sign in at {{loginUrl}} with your Student ID, Email, or Phone to access your syllabus and lessons.</p>
<p>Best regards,<br/>Academic Support Team</p>`,
  },
  {
    key: 'account_credentials',
    channel: 'WHATSAPP',
    locale: 'en',
    body: `🔐 *Your Academy Student Credentials*

Hello {{studentName}},
Your Student LMS account has been created:

• *Student ID:* {{studentId}}
• *Login URL:* {{loginUrl}}
{{credentialDetails}}

Please log in and begin your enrolled course. Welcome aboard!`,
  },
  {
    key: 'account_credentials',
    channel: 'SMS',
    locale: 'en',
    body: `Creative & IT Academy: Hello {{studentName}}, your Student ID is {{studentId}}. Login at {{loginUrl}} to set up password and access courses.`,
  },

  // 2. Account Credentials (Bengali - Marked for Client Review)
  {
    key: 'account_credentials',
    channel: 'EMAIL',
    locale: 'bn',
    subject: 'আপনার স্টুডেন্ট পোর্টাল লগইন বিবরণ - ক্রিয়েটিভ অ্যান্ড আইটি একাডেমি',
    body: `<h2>অনলাইন ক্রিয়েটিভ অ্যান্ড আইটি একাডেমিতে স্বাগতম</h2>
<p>প্রিয় {{studentName}},</p>
<p>আপনার স্টুডেন্ট আইডি সফলভাবে তৈরি হয়েছে:</p>
<div style="background:#f1f5f9;padding:16px;border-radius:8px;font-family:monospace;">
  <p><strong>স্টুডেন্ট আইডি:</strong> {{studentId}}</p>
  <p><strong>রেজিস্টার্ড ইমেইল:</strong> {{email}}</p>
  <p><strong>লগইন লিংক:</strong> <a href="{{loginUrl}}">{{loginUrl}}</a></p>
  {{#if setupUrl}}
  <p><strong>পাসওয়ার্ড সেটআপ লিংক:</strong> <a href="{{setupUrl}}">{{setupUrl}}</a></p>
  {{/if}}
</div>
<p>ধন্যবাদান্তে,<br/>অনলাইন ক্রিয়েটিভ অ্যান্ড আইটি একাডেমি</p>`,
  },
  {
    key: 'account_credentials',
    channel: 'WHATSAPP',
    locale: 'bn',
    body: `🔐 *আপনার স্টুডেন্ট পোর্টাল একাউন্ট*

প্রিয় {{studentName}},
আপনার স্টুডেন্ট আইডি: *{{studentId}}*
লগইন লিংক: {{loginUrl}}
{{credentialDetails}}

অনলাইন ক্রিয়েটিভ অ্যান্ড আইটি একাডেমিতে স্বাগতম!`,
  },

  // 3. Course Added (Returning Student)
  {
    key: 'course_added',
    channel: 'EMAIL',
    locale: 'en',
    subject: 'New Course Added to Your Account: {{courseTitle}}',
    body: `<h2>New Course Enrollment Confirmed</h2>
<p>Hello {{studentName}},</p>
<p><strong>{{courseTitle}}</strong> ({{mode}} Mode) has been successfully added to your existing student account (Student ID: <strong>{{studentId}}</strong>).</p>
<p>Log in at <a href="{{loginUrl}}">{{loginUrl}}</a> with your existing credentials to access your new course dashboard.</p>`,
  },
  {
    key: 'course_added',
    channel: 'WHATSAPP',
    locale: 'en',
    body: `📚 *New Course Added!*

Hello {{studentName}},
*{{courseTitle}}* has been added to your Student ID (*{{studentId}}*).
Log in at {{loginUrl}} to begin learning.`,
  },
  {
    key: 'course_added',
    channel: 'SMS',
    locale: 'en',
    body: `Creative & IT Academy: {{courseTitle}} added to your Student ID {{studentId}}. Login at {{loginUrl}} to view.`,
  },

  // 4. Password Reset
  {
    key: 'password_reset',
    channel: 'EMAIL',
    locale: 'en',
    subject: 'Reset Your Password - Online Creative & IT Academy',
    body: `<h2>Password Reset Request</h2>
<p>Hello {{name}},</p>
<p>We received a request to reset your password. Click the link below to set a new password:</p>
<p><a href="{{resetUrl}}" style="background:#4f46e5;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Reset Password</a></p>
<p>Or copy this URL into your browser: <br/>{{resetUrl}}</p>
<p>This single-use link will expire in {{expiresInHours}} hour(s). If you did not request this, please ignore this email.</p>`,
  },
  {
    key: 'password_reset',
    channel: 'WHATSAPP',
    locale: 'en',
    body: `🔑 *Password Reset Request*

Hello {{name}},
Use the link below to reset your academy password (valid for {{expiresInHours}} hour):
{{resetUrl}}

If you did not request this, please ignore this message.`,
  },
  {
    key: 'password_reset',
    channel: 'SMS',
    locale: 'en',
    body: `Creative & IT Academy: Password reset link for {{name}}: {{resetUrl}} (Expires in {{expiresInHours}}h).`,
  },

  // 5. Payment Failed
  {
    key: 'payment_failed',
    channel: 'EMAIL',
    locale: 'en',
    subject: 'Payment Incomplete for {{courseTitle}}',
    body: `<h2>Payment Notification</h2>
<p>Hello {{applicantName}},</p>
<p>Your payment attempt for <strong>{{courseTitle}}</strong> could not be completed. You may retry your admission at <a href="{{checkoutUrl}}">{{checkoutUrl}}</a>.</p>`,
  },
  {
    key: 'payment_failed',
    channel: 'WHATSAPP',
    locale: 'en',
    body: `⚠️ *Payment Incomplete*

Hello {{applicantName}},
Your payment for *{{courseTitle}}* was not successful. Retry your admission here: {{checkoutUrl}}`,
  },

  // 6. Batch Reminder (Live Session)
  {
    key: 'batch_reminder',
    channel: 'EMAIL',
    locale: 'en',
    subject: 'Upcoming Live Session: {{sessionTitle}}',
    body: `<h2>Live Class Reminder</h2>
<p>Hello {{studentName}},</p>
<p>Your live class for <strong>{{courseTitle}}</strong> is scheduled to start at <strong>{{startsAt}}</strong>.</p>
<p><a href="{{joinUrl}}">Join Live Class</a></p>`,
  },
  {
    key: 'batch_reminder',
    channel: 'WHATSAPP',
    locale: 'en',
    body: `⏰ *Live Class Reminder*

Hello {{studentName}},
Your class *{{sessionTitle}}* for *{{courseTitle}}* starts at *{{startsAt}}*.
Join here: {{joinUrl}}`,
  },
];
