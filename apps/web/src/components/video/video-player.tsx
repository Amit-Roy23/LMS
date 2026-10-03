'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  CheckCircle2,
  FastForward,
  ShieldCheck,
  Code2,
  Terminal,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { apiClient } from '../../lib/api';
import { formatDuration } from '../../lib/utils';
import { useToast } from '../../providers/toast-provider';

export interface VideoPlayerProps {
  lessonId: string;
  videoUrl: string;
  title: string;
  initialPercent?: number;
  initialWatchedSeconds?: number;
  isCompleted?: boolean;
  onProgressUpdate?: (percent: number, isCompleted: boolean) => void;
  onComplete?: () => void;
}

// Reliable fallback MP4 sources across CDNs
const FALLBACK_VIDEOS = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
];

export function VideoPlayer({
  lessonId,
  videoUrl,
  title,
  initialPercent = 0,
  initialWatchedSeconds = 0,
  isCompleted = false,
  onProgressUpdate,
  onComplete,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { success, error: toastError } = useToast();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialWatchedSeconds);
  const [duration, setDuration] = useState(600); // Default 10 mins
  const [watchPercent, setWatchPercent] = useState(initialPercent);
  const [completed, setCompleted] = useState(isCompleted);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [currentVideoSrc, setCurrentVideoSrc] = useState(videoUrl || FALLBACK_VIDEOS[0]);

  // Check if URL is YouTube
  const ytMatch = videoUrl ? videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/) : null;
  const isYouTube = !!ytMatch;
  const ytEmbedUrl = ytMatch ? `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?enablejsapi=1&rel=0` : null;

  // Sync when lessonId or isCompleted changes
  useEffect(() => {
    setWatchPercent(initialPercent);
    setCompleted(isCompleted);
    setCurrentTime(initialWatchedSeconds);
    setHasVideoError(false);
    setCurrentVideoSrc(videoUrl || FALLBACK_VIDEOS[0]);
    setIsPlaying(false);

    if (videoRef.current) {
      try {
        videoRef.current.currentTime = initialWatchedSeconds;
      } catch (e) {
        // Ignore seek error during re-mount
      }
    }
  }, [lessonId, initialPercent, initialWatchedSeconds, isCompleted, videoUrl]);

  // Save progress to server
  const saveProgressToServer = useCallback(
    async (seconds: number, pct: number, markComplete = false) => {
      try {
        setIsSaving(true);
        const res = await apiClient<{ progress: any; isCompleted: boolean; coursePercent: number }>(
          `/lessons/${lessonId}/progress`,
          {
            method: 'POST',
            body: JSON.stringify({
              lessonId,
              watchedSeconds: Math.round(seconds),
              percent: Math.min(100, Math.round(pct)),
              markComplete,
            }),
          }
        );

        if (res.isCompleted && !completed) {
          setCompleted(true);
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
          });
          success('🎉 Lesson Completed!', 'You have completed this video lesson.');
          onComplete?.();
        }

        onProgressUpdate?.(pct, res.isCompleted);
      } catch (err) {
        console.error('Failed to sync lesson progress', err);
      } finally {
        setIsSaving(false);
      }
    },
    [lessonId, completed, success, onComplete, onProgressUpdate]
  );

  // Time update throttle
  const lastSyncRef = useRef<number>(0);
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration || duration || 600;
    setCurrentTime(curr);

    const pct = Math.min(100, (curr / dur) * 100);
    setWatchPercent((prev) => Math.max(prev, pct));

    // Sync to backend every 10 seconds or when reaching 90%
    const now = Date.now();
    if (now - lastSyncRef.current > 10000 || (pct >= 90 && !completed)) {
      lastSyncRef.current = now;
      saveProgressToServer(curr, Math.max(watchPercent, pct), pct >= 90);
    }
  };

  // Safe Play/Pause Handler
  const togglePlay = () => {
    if (hasVideoError || isYouTube) {
      // For simulated or YouTube mode, toggle simulation playback
      setIsPlaying((prev) => !prev);
      return;
    }

    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn('Playback error, falling back to Interactive Studio mode:', err);
            setHasVideoError(true);
            setIsPlaying(true);
          });
      }
    }
  };

  // Simulated playback ticker when in error or interactive mode
  useEffect(() => {
    let interval: any;
    if (isPlaying && (hasVideoError || isYouTube)) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + playbackSpeed;
          const dur = duration || 600;
          const pct = Math.min(100, (next / dur) * 100);
          setWatchPercent((old) => Math.max(old, pct));

          const now = Date.now();
          if (now - lastSyncRef.current > 10000 || (pct >= 90 && !completed)) {
            lastSyncRef.current = now;
            saveProgressToServer(next, pct, pct >= 90);
          }

          if (next >= dur) {
            setIsPlaying(false);
            saveProgressToServer(dur, 100, true);
            return dur;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, hasVideoError, isYouTube, playbackSpeed, duration, completed, saveProgressToServer]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (videoRef.current && !hasVideoError) {
      try {
        videoRef.current.currentTime = target;
      } catch (e) {
        // Ignore seek error
      }
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const changeSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current && !hasVideoError) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleManualComplete = () => {
    const finalSec = duration || 600;
    setCurrentTime(finalSec);
    setWatchPercent(100);
    saveProgressToServer(finalSec, 100, true);
  };

  const handleVideoError = () => {
    console.warn('Video source failed to load, activating interactive presentation mode.');
    setHasVideoError(true);
  };

  return (
    <div className="w-full space-y-4">
      {/* Video Container */}
      <div
        ref={containerRef}
        className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#07090e] border border-slate-800 shadow-2xl group select-none"
      >
        {isYouTube && ytEmbedUrl ? (
          /* YouTube Embed Player */
          <div className="w-full h-full relative bg-black">
            <iframe
              src={ytEmbedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        ) : !hasVideoError ? (
          /* HTML5 Video Player */
          <video
            ref={videoRef}
            src={currentVideoSrc}
            playsInline
            onError={handleVideoError}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              if (videoRef.current && videoRef.current.duration) {
                setDuration(videoRef.current.duration);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              saveProgressToServer(duration || 600, 100, true);
            }}
            className="w-full h-full object-contain cursor-pointer bg-black"
            onClick={togglePlay}
          />
        ) : (
          /* Interactive Code & Studio Presentation Mode (Graceful Offline / Video Fallback) */
          <div
            onClick={togglePlay}
            className="w-full h-full flex flex-col justify-between p-6 bg-gradient-to-br from-[#0a0e1a] via-[#0d1322] to-[#070a12] text-slate-100 cursor-pointer relative overflow-hidden"
          >
            {/* Background Grid Accent */}
            <div className="absolute inset-0 tech-dot-grid opacity-30 pointer-events-none" />

            {/* Top Bar of Studio Player */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono font-semibold text-slate-300">
                  INTERACTIVE ACADEMY WORKSHOP STUDIO
                </span>
              </div>
              <Badge variant="cyan" className="text-[10px]">
                {isPlaying ? '▶ STREAMING' : '⏸ PAUSED'}
              </Badge>
            </div>

            {/* Middle Terminal Content Animation */}
            <div className="z-10 max-w-xl mx-auto text-center space-y-3 my-auto">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
                <Code2 className="w-7 h-7" />
              </div>
              <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight">
                {title}
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Click anywhere on the player to start streaming. Watch telemetry automatically syncs your progress with the progression engine.
              </p>

              {/* Code Snippet Walkthrough Box */}
              <div className="text-left bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 font-mono text-[11px] text-slate-300 shadow-inner max-w-md mx-auto space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 pb-1 border-b border-slate-900">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  <span>lesson_telemetry.ts</span>
                </div>
                <p className="text-blue-400">export function <span className="text-amber-300">trackWatchProgress</span>() {'{'}</p>
                <p className="pl-4 text-slate-400">// Progress: <span className="text-emerald-400 font-bold">{Math.round(watchPercent)}%</span> of 90% required</p>
                <p className="pl-4 text-indigo-300">await progressionService.recordProgress(lessonId);</p>
                <p className="text-blue-400">{'}'}</p>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 text-center z-10">
              Online Creative & IT Academy • High Definition Multi-Track Streaming
            </div>
          </div>
        )}

        {/* Center Play Overlay when Paused */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer backdrop-blur-[2px] transition-all z-20"
          >
            <div className="w-16 h-16 rounded-full bg-blue-600/90 hover:bg-blue-500 flex items-center justify-center text-white shadow-xl shadow-blue-600/50 hover:scale-110 transition-transform">
              <Play className="w-7 h-7 ml-1 fill-white" />
            </div>
          </div>
        )}

        {/* Custom Player Controls Bar */}
        <div className="absolute bottom-0 inset-x-0 bg-[#07090e]/95 border-t border-[#1e2638] p-3 flex flex-col gap-2 opacity-95 group-hover:opacity-100 transition-opacity z-30">
          {/* Progress Timeline Slider */}
          <div className="relative w-full flex items-center group/slider">
            <input
              type="range"
              min={0}
              max={duration || 600}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-[#1e2638] rounded appearance-none cursor-pointer accent-blue-500 hover:h-1.5 transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-200">
            {/* Left Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                title={isPlaying ? 'Pause' : 'Play'}
                className="p-1 rounded hover:text-blue-400 transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>

              <button
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
                className="p-1 rounded hover:text-blue-400 transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              <span className="font-mono text-[11px] text-slate-300">
                {formatDuration(currentTime)} / {formatDuration(duration || 600)}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={changeSpeed}
                title="Change Speed"
                className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                {playbackSpeed}x
              </button>

              <button
                onClick={toggleFullscreen}
                title="Fullscreen"
                className="p-1 rounded hover:text-blue-400 transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Footer Status & Manual Completion Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0c101a] border border-slate-800">
        <div>
          <h3 className="font-bold text-white text-sm">{title}</h3>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
            <span>Watch Progress: <b className="text-blue-400">{Math.round(watchPercent)}%</b></span>
            <span>•</span>
            <span className="text-slate-300 font-medium">90% required to unlock module quiz</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {completed ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Lesson Completed
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualComplete}
              className="border-blue-500/40 text-blue-300 hover:bg-blue-600/20 text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-blue-400" />
              Mark Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
