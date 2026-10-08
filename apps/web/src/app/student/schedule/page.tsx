'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Calendar,
  Clock,
  Radio,
  Video,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MapPin,
  PlayCircle,
} from 'lucide-react';
import { LiveProvider } from '@academy/shared';
import { useToast } from '../../../providers/toast-provider';

export default function StudentLiveSchedulePage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userTimezone, setUserTimezone] = useState<string>('Asia/Kolkata');
  const [now, setNow] = useState<number>(Date.now());
  const { success, error: toastError, info } = useToast();

  // Update clock every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Detect student local timezone or default
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setUserTimezone(tz);
    } catch (e) {}
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient<any[]>('/student/live-sessions');
      setSessions(res || []);
    } catch (err) {
      console.error('Failed to load live sessions', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Handle Join Live Session
  const handleJoinSession = async (sessionId: string) => {
    try {
      const res = await apiClient<{ joinUrl: string; provider: string }>(
        `/student/live-sessions/${sessionId}/join`,
        { method: 'POST' }
      );
      if (res.joinUrl) {
        success('Joining Live Class', 'Your attendance has been recorded.');
        window.open(res.joinUrl, '_blank', 'noopener,noreferrer');
        loadSessions();
      }
    } catch (err: any) {
      toastError('Cannot Join', err.message || 'The join window is not currently open.');
    }
  };

  // Download iCal
  const handleDownloadIcal = (sessionId: string) => {
    window.open(`/api/v1/student/live-sessions/${sessionId}/ical`, '_blank');
  };

  // Format date in student timezone
  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: userTimezone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch (e) {
      return dateStr;
    }
  };

  // Calculate countdown to session start
  const getCountdown = (startsAtStr: string) => {
    const diff = new Date(startsAtStr).getTime() - now;
    if (diff <= 0) return 'Class in session';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Starts in ${days}d ${hours % 24}h`;
    }

    return `Starts in ${hours}h ${minutes}m ${seconds}s`;
  };

  // Filter sessions
  const upcoming = sessions.filter(
    (s) => new Date(s.startsAt).getTime() + (s.durationMinutes || 60) * 60000 >= now
  );
  const past = sessions.filter(
    (s) => new Date(s.startsAt).getTime() + (s.durationMinutes || 60) * 60000 < now
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-extrabold text-ink tracking-tight">Live Classes & Schedule</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Interactive live sessions, workshop attendance records, and recorded class archives.
          </p>
        </div>

        {/* Timezone Switcher */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Timezone:</span>
          <select
            value={userTimezone}
            onChange={(e) => setUserTimezone(e.target.value)}
            className="bg-transparent text-ink font-bold focus:outline-none cursor-pointer"
          >
            <option value="Asia/Kolkata" className="bg-slate-900">Asia/Kolkata (IST)</option>
            <option value="UTC" className="bg-slate-900">UTC</option>
            <option value="America/New_York" className="bg-slate-900">America/New_York (EST)</option>
            <option value="Europe/London" className="bg-slate-900">Europe/London (GMT)</option>
            <option value="Asia/Dubai" className="bg-slate-900">Asia/Dubai (GST)</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-36 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-800 bg-slate-900/40">
          <Radio className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-ink">No scheduled live classes</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You are either enrolled in a self-paced recorded track or your batch instructor has not scheduled live sessions yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-10">
          {/* Section 1: Upcoming & Live Now */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>Upcoming & Live Sessions</span>
            </h2>

            {upcoming.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 bg-slate-900/40 rounded-xl border border-slate-800/80">
                No upcoming classes scheduled for the remainder of this week.
              </p>
            ) : (
              <div className="space-y-4">
                {upcoming.map((session) => {
                  const startTime = new Date(session.startsAt).getTime();
                  const endTime = startTime + (session.durationMinutes || 60) * 60000;
                  const isLiveNow = now >= startTime && now <= endTime;
                  const canJoin = session.canJoin || isLiveNow;
                  const attended = !!session.attended;

                  return (
                    <Card
                      key={session.id}
                      className={`p-6 border transition-all shadow-xl ${
                        isLiveNow
                          ? 'border-purple-500/50 bg-gradient-to-r from-purple-950/40 via-slate-900/90 to-slate-900/90'
                          : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2 max-w-xl">
                          <div className="flex items-center gap-2">
                            {isLiveNow ? (
                              <Badge variant="purple" className="gap-1.5 font-bold uppercase tracking-wider text-[10px] animate-pulse">
                                <Radio className="w-3 h-3" /> Live Class Active
                              </Badge>
                            ) : (
                              <Badge variant="primary" className="text-[10px] font-mono">
                                {session.batch?.className || 'Live Batch'}
                              </Badge>
                            )}

                            <span className="text-xs font-mono text-slate-400">
                              {session.provider} Workshop
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-ink">{session.title}</h3>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                              {formatDateTime(session.startsAt)}
                            </span>

                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-purple-400" />
                              {session.durationMinutes} Minutes
                            </span>

                            {!isLiveNow && (
                              <span className="text-amber-400/90 font-bold">
                                {getCountdown(session.startsAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDownloadIcal(session.id)}
                            className="h-9 text-xs gap-1.5"
                            title="Add to Google Calendar / Outlook (iCal)"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>iCal</span>
                          </Button>

                          <Button
                            variant={canJoin ? 'gradient' : 'primary'}
                            size="sm"
                            disabled={!canJoin}
                            onClick={() => handleJoinSession(session.id)}
                            className={`h-9 text-xs gap-1.5 ${
                              canJoin ? 'shadow-lg shadow-purple-600/30' : 'opacity-60'
                            }`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{canJoin ? 'Join Live Class' : 'Opens 15m prior'}</span>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Past Sessions & Class Recordings */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-400" />
              <span>Past Class Recordings & Attendance</span>
            </h2>

            {past.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 bg-slate-900/40 rounded-xl border border-slate-800/80">
                No past sessions recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {past.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-ink">{session.title}</h4>
                        {session.attended ? (
                          <Badge variant="success" className="gap-1 text-[10px] py-0 px-2">
                            <CheckCircle2 className="w-3 h-3" /> Attended
                          </Badge>
                        ) : (
                          <Badge variant="purple" className="text-[10px] py-0 px-2 opacity-70">
                            Missed Class
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                        <span>{formatDateTime(session.startsAt)}</span>
                        <span>•</span>
                        <span>{session.durationMinutes} mins</span>
                      </div>
                    </div>

                    <div>
                      {session.recordingUrl ? (
                        <a
                          href={session.recordingUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button variant="secondary" size="sm" className="h-8 text-xs gap-1.5">
                            <PlayCircle className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Watch Recording</span>
                          </Button>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500 font-mono italic">
                          Recording coming soon
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
