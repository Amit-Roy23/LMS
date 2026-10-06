'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api';
import { useToast } from '../../../providers/toast-provider';
import { Card, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
} from 'lucide-react';

export default function AdminNotificationsPage() {
  const { success, error: toastError } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(channelFilter ? { channel: channelFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
      });

      const res = await apiClient<any>(`/admin/notifications?${params.toString()}`);
      setLogs(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      toastError('Load Failed', err.message || 'Could not fetch notification logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, channelFilter, statusFilter]);

  const handleRetry = async (logId: string) => {
    try {
      setIsRetrying(logId);
      await apiClient(`/admin/notifications/${logId}/retry`, {
        method: 'POST',
      });
      success('Notification Queued', 'The notification has been queued for immediate retry.');
      await fetchLogs();
    } catch (err: any) {
      toastError('Retry Failed', err.message || 'Could not retry notification.');
    } finally {
      setIsRetrying(null);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return <Mail className="w-3.5 h-3.5 text-blue-600" />;
      case 'WHATSAPP':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />;
      case 'SMS':
        return <Smartphone className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <Badge variant="success">SENT</Badge>;
      case 'QUEUED':
        return <Badge variant="purple">QUEUED</Badge>;
      case 'FAILED':
        return <Badge variant="danger">FAILED</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Notification Logs & Dispatch</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pluggable queue audit for Email, WhatsApp Cloud API, and SMS delivery.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchLogs} isLoading={isLoading} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Logs</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="border-[#efdfd4] bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">
              Channel
            </label>
            <select
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 rounded-lg border border-[#f0e2d8] bg-white px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Channels</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="SMS">SMS</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 rounded-lg border border-[#f0e2d8] bg-white px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="SENT">Sent</option>
              <option value="QUEUED">Queued</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">
              Search Recipient / Template
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Search masked address or template..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              />
              <Button variant="primary" size="sm" onClick={fetchLogs} className="shrink-0">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="border-[#efdfd4] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#fff8f3] text-slate-600 font-mono uppercase text-[10px] border-b border-[#f0e2d8]">
              <tr>
                <th className="p-3.5 pl-4">Channel</th>
                <th className="p-3.5">Recipient (Masked)</th>
                <th className="p-3.5">Template</th>
                <th className="p-3.5">Provider Ref</th>
                <th className="p-3.5">Attempts</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No notification dispatch records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-1.5 font-bold font-mono">
                        {getChannelIcon(log.channel)}
                        <span>{log.channel}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono font-semibold text-slate-900">
                      {log.to}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">
                      {log.templateKey}
                    </td>
                    <td className="p-3.5 font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                      {log.providerMessageId || log.provider || '—'}
                    </td>
                    <td className="p-3.5 font-mono">
                      {log.attempts || 1}
                    </td>
                    <td className="p-3.5">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3.5 pr-4 text-right">
                      {log.status === 'FAILED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={isRetrying === log.id}
                          onClick={() => handleRetry(log.id)}
                          className="gap-1 text-[11px] text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          <Send className="w-3 h-3" />
                          <span>Retry</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
