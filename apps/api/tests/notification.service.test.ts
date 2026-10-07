import { describe, it, expect, vi } from 'vitest';
import { renderTemplate, escapeHtml } from '../src/services/notification/template.engine.js';
import { maskRecipient } from '../src/lib/student-id.js';

describe('Notification Template Engine & Formatting', () => {
  it('correctly escapes dangerous HTML characters when isHtml is true', () => {
    const raw = '<script>alert("XSS")</script>&"\'';
    const escaped = escapeHtml(raw);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;&amp;&quot;&#039;');
  });

  it('renders variables with HTML escaping in HTML templates', () => {
    const template = '<h1>Welcome, {{name}}!</h1><p>Course: {{course}}</p>';
    const variables = {
      name: '<John & Jane>',
      course: 'Full-Stack <b>AI</b>',
    };

    const rendered = renderTemplate(template, variables, { isHtml: true });
    expect(rendered).toBe('<h1>Welcome, &lt;John &amp; Jane&gt;!</h1><p>Course: Full-Stack &lt;b&gt;AI&lt;/b&gt;</p>');
  });

  it('renders plain text templates without escaping quotes/brackets', () => {
    const template = 'Hello {{name}}, your link is {{link}}';
    const variables = {
      name: 'John Doe',
      link: 'https://academy.com/login?token=abc&ref=123',
    };

    const rendered = renderTemplate(template, variables, { isHtml: false });
    expect(rendered).toBe('Hello John Doe, your link is https://academy.com/login?token=abc&ref=123');
  });

  it('handles missing variables gracefully with empty strings', () => {
    const template = 'Hello {{name}}, batch is {{batchName}}';
    const variables = { name: 'Alice' };

    const rendered = renderTemplate(template, variables);
    expect(rendered).toBe('Hello Alice, batch is ');
  });

  it('masks emails and phone numbers correctly for audit logging', () => {
    expect(maskRecipient('john.doe@example.com')).toBe('j******e@example.com');
    expect(maskRecipient('ab@test.com')).toBe('*@test.com');
    expect(maskRecipient('+919876543210')).toBe('+91********10');
    expect(maskRecipient('+14155550199')).toBe('+14*******99');
  });
});
