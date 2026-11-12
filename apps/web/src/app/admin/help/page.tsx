'use client';

import React from 'react';
import { Card } from '../../../components/ui/card';
import { Markdown, PROSE } from '../../../components/legal/markdown';
import { CONSOLE_GUIDE } from '../../../content/console-guide';
import { LifeBuoy } from 'lucide-react';

export default function ConsoleHelpPage() {
  // The guide's own "# title" line is replaced by the page heading
  const body = CONSOLE_GUIDE.replace(/^#\s.*\n/, '');
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <LifeBuoy className="w-6 h-6 text-indigo-400" /> Help: console guide
        </h1>
        <p className="text-sm text-slate-400 mt-1">How to use each part of the console. Sections marked for main admins need the PIN + OTP.</p>
      </div>
      <Card className="p-6 sm:p-8">
        <div className={PROSE}>
          <Markdown source={body} />
        </div>
      </Card>
    </div>
  );
}
