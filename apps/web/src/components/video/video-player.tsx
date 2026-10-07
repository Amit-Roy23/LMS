'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  CheckCircle2,
  FastForward,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Clock,
  Lock,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { apiClient } from '../../lib/api';
import { formatDuration } from '../../lib/utils';
import { useToast } from '../../providers/toast-provider';
import { VideoProvider } from '@academy/shared';

export interface VideoPlayerProps {
  lessonId: string;
  videoUrl: string;
  videoProvider?: VideoProvider | string;
  title: string;
  studentId?: string;
  studentName?: string;
  watermarkEnabled?: boolean;
  initialPercent?: number;
  initialWatchedSeconds?: number;
  isCompleted?: boolean;
  onProgressUpdate?: (percent: number, isCompleted: boolean) => void;
  onComplete?: () => void;
}

export function VideoPlayer({
  lessonId,
  videoUrl,
  videoProvider = VideoProvider.MP4,
  title,
  studentId = 'STU-STUDENT',
  studentName = 'Student',
  watermarkEnabled = true,
  initialPercent = 0,
  initialWatchedSeconds = 0,
  isCompleted = false,
  onProgressUpdate,
  onComplete,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { success, error: toastError, info } = useToast();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialWatchedSeconds);
  const [duration, setDuration] = useState(600);
  const [watchPercent, setWatchPercent] = useState(initialPercent);
  const [completed, setCompleted] = useState(isCompleted);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [watermarkPos, setWatermarkPos] = useState({ top: 15, left: 15 });
  const [isBuffering, setIsBuffering] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Rendered demo videos ship with a poster frame next to the MP4
  const posterUrl = videoUrl && /^\/media\/.+\.mp4$/.test(videoUrl) ? videoUrl.replace(/\.mp4$/, '.jpg') : undefined;

  // Played interval tracking for tamper-proof heartbeat
  const currentIntervalStartRef = useRef<number | null>(null);
  const playedIntervalsRef = useRef<{ start: number; end: number }[]>([]);
  const lastHeartbeatTimeRef = useRef<number>(Date.now());
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic floating watermark position animation
  useEffect(() => {
    if (!watermarkEnabled) return;
    const interval = setInterval(() => {
      // Random gentle drift across corners
      const top = Math.floor(Math.random() * 70) + 10;
      const left = Math.floor(Math.random() * 70) + 10;
      setWatermarkPos({ top, left });
    }, 12000);
    return () => clearInterval(interval);
  }, [watermarkEnabled]);

  // Sync props when lesson changes
  useEffect(() => {
    setWatchPercent(initialPercent);
    setCompleted(isCompleted);
    setCurrentTime(initialWatchedSeconds);
    setIsPlaying(false);
    playedIntervalsRef.current = [];
    currentIntervalStartRef.current = null;
    setLoadError(false);
    setIsBuffering(false);

    if (videoRef.current) {
      try {
        videoRef.current.currentTime = initialWatchedSeconds;
      } catch (e) {}
    }
  }, [lessonId, initialPercent, initialWatchedSeconds, isCompleted]);

  // Send tamper-proof heartbeat to server
  const sendHeartbeat = useCallback(
    async (position: number, flushInterval = false) => {
      // Flush currently active interval
      if (currentIntervalStartRef.current !== null) {
        const start = currentIntervalStartRef.current;
        const end = position;
        if (end > start) {
          playedIntervalsRef.current.push({
            start: Math.round(start * 10) / 10,
            end: Math.round(end * 10) / 10,
          });
        }
        currentIntervalStartRef.current = isPlaying ? position : null;
      }

      if (playedIntervalsRef.current.length === 0 && !flushInterval) {
        return;
      }

      const payload = {
        positionSeconds: Math.round(position),
        playedIntervals: [...playedIntervalsRef.current],
        playbackRate: playbackSpeed,
      };

      // Reset local intervals buffer after sending
      playedIntervalsRef.current = [];

      try {
        setIsSaving(true);
        const data = await apiClient<{
          progress: { percent: number; watchedSeconds: number; isCompleted: boolean };
          coursePercent: number;
          thresholdMet: boolean;
        }>(`/student/lessons/${lessonId}/progress`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const res = data.progress;

        if (res.percent !== undefined) {
          setWatchPercent(res.percent);
        }

        if (res.isCompleted && !completed) {
          setCompleted(true);
          info('Lesson Completed', 'You have met the required watch threshold.');
          onComplete?.();
        }

        onProgressUpdate?.(res.percent, res.isCompleted);
      } catch (err) {
        console.warn('Heartbeat sync deferred', err);
      } finally {
        setIsSaving(false);
      }
    },
    [lessonId, isPlaying, playbackSpeed, completed, onComplete, onProgressUpdate, info]
  );

  // Send beacon on page unload / hide
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && videoRef.current) {
        sendHeartbeat(videoRef.current.currentTime, true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleVisibilityChange);
    };
  }, [sendHeartbeat]);

  // Handle Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const onPlay = () => {
    setIsPlaying(true);
    if (videoRef.current) {
      currentIntervalStartRef.current = videoRef.current.currentTime;
    }
  };

  const onPause = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      sendHeartbeat(videoRef.current.currentTime, true);
    }
  };

  const onTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration || duration || 600;
    setCurrentTime(curr);
    setDuration(dur);

    // Send periodic heartbeat every 12 seconds
    const now = Date.now();
    if (now - lastHeartbeatTimeRef.current > 12000) {
      lastHeartbeatTimeRef.current = now;
      sendHeartbeat(curr);
    }
  };

  // Seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const target = parseFloat(e.target.value);
    // Flush interval prior to seek
    if (currentIntervalStartRef.current !== null && target !== currentIntervalStartRef.current) {
      const end = videoRef.current.currentTime;
      if (end > currentIntervalStartRef.current) {
        playedIntervalsRef.current.push({
          start: Math.round(currentIntervalStartRef.current * 10) / 10,
          end: Math.round(end * 10) / 10,
        });
      }
      currentIntervalStartRef.current = isPlaying ? target : null;
    }
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  // Speed changing
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime += 10;
      } else if (e.key === 'ArrowLeft' || e.key === 'j') {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime -= 10;
      } else if (e.key === 'm') {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      } else if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Provider detection & Embed rendering
  const isYouTube =
    videoProvider === VideoProvider.YOUTUBE ||
    (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')));
  const isVimeo =
    videoProvider === VideoProvider.VIMEO || (videoUrl && videoUrl.includes('vimeo.com'));

  const getYouTubeEmbed = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?enablejsapi=1&rel=0&modestbranding=1` : url;
  };

  const getVimeoEmbed = (url: string) => {
    const match = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}?dnt=1&title=0&byline=0` : url;
  };

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()} // Anti-piracy right-click lock
      onMouseMove={() => {
        setShowControls(true);
        if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
        hideControlsTimeoutRef.current = setTimeout(() => {
          if (isPlaying) setShowControls(false);
        }, 3000);
      }}
      className="relative w-full aspect-video bg-night-950 rounded-2xl overflow-hidden shadow-2xl border border-night-800 select-none group"
    >
      {/* 1. Video Player Element / Embed */}
      {isYouTube ? (
        <iframe
          src={getYouTubeEmbed(videoUrl)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      ) : isVimeo ? (
        <iframe
          src={getVimeoEmbed(videoUrl)}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      ) : (
        <video
          key={`${videoUrl}-${reloadKey}`}
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl}
          preload="metadata"
          playsInline
          muted={isMuted}
          onPlay={onPlay}
          onPause={onPause}
          onTimeUpdate={onTimeUpdate}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onCanPlay={() => setIsBuffering(false)}
          onError={() => {
            setIsBuffering(false);
            setIsPlaying(false);
            setLoadError(true);
          }}
          onEnded={() => {
            setIsPlaying(false);
            if (videoRef.current) sendHeartbeat(videoRef.current.duration || videoRef.current.currentTime, true);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration);
          }}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer bg-black"
        />
      )}

      {/* Buffering spinner */}
      {isBuffering && !loadError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <span className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>
      )}

      {/* Friendly error state with retry */}
      {loadError && !isYouTube && !isVimeo && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-night-950/95 text-center px-6">
          <AlertCircle className="w-10 h-10 text-amber-500" />
          <p className="text-white font-semibold">This video couldn&apos;t be loaded</p>
          <p className="text-sm text-night-400 max-w-sm">
            Check your connection and try again. Your watch progress is saved.
          </p>
          <button
            onClick={() => {
              setLoadError(false);
              setReloadKey((k) => k + 1);
            }}
            className="mt-1 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-night-900 hover:bg-night-100"
          >
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {/* 2. Anti-Piracy Dynamic Floating Watermark (Student ID & Timestamp) */}
      {watermarkEnabled && (
        <div
          style={{
            top: `${watermarkPos.top}%`,
            left: `${watermarkPos.left}%`,
            transition: 'top 4s ease-in-out, left 4s ease-in-out',
          }}
          className="absolute pointer-events-none z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-mono font-medium text-white/50 tracking-wider shadow-lg select-none"
        >
          <ShieldCheck className="w-3 h-3 text-indigo-400/60" />
          <span>{studentId}</span>
          <span className="text-white/20">•</span>
          <span>{studentName}</span>
        </div>
      )}

      {/* 3. HTML5 Custom Controls Overlay (for native/HLS MP4 streams) */}
      {!isYouTube && !isVimeo && (
        <div
          className={`absolute inset-0 bg-gradient-to-t from-night-950/90 via-transparent to-black/30 pointer-events-none transition-opacity duration-300 flex flex-col justify-between p-4 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Top Bar: Title & Status */}
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white drop-shadow truncate max-w-md">{title}</h3>
              {completed && (
                <Badge variant="success" className="gap-1 py-0.5 text-[10px]">
                  <CheckCircle2 className="w-3 h-3" /> Completed
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-night-200 font-mono bg-night-900/60 backdrop-blur px-2.5 py-1 rounded-lg border border-night-700/50">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>{Math.round(watchPercent)}% watched</span>
            </div>
          </div>

          {/* Center Play/Pause Trigger */}
          <div className="flex items-center justify-center pointer-events-auto">
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/50 transition-transform transform hover:scale-110 active:scale-95 border border-indigo-400/30"
              >
                <Play className="w-8 h-8 fill-current ml-1" />
              </button>
            )}
          </div>

          {/* Bottom Controls Bar */}
          <div className="space-y-2 pointer-events-auto">
            {/* Scrubber Progress Bar */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-night-200 min-w-[42px]">
                {formatDuration(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 600}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-night-700/80 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all"
              />
              <span className="text-xs font-mono text-night-400 min-w-[42px]">
                {formatDuration(duration)}
              </span>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-indigo-400 transition-colors p-1"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                <button
                  onClick={() => setIsMuted((m) => !m)}
                  className="text-white hover:text-indigo-400 transition-colors p-1"
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
                </button>

                {/* Speed: one cycling button on phones */}
                <button
                  onClick={() => {
                    const speeds = [0.75, 1, 1.25, 1.5, 2];
                    handleSpeedChange(speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length]);
                  }}
                  className="sm:hidden px-2 py-0.5 text-[11px] font-bold rounded bg-night-900/70 border border-night-700/40 text-white"
                >
                  {playbackSpeed}x
                </button>

                {/* Speed Selector */}
                <div className="hidden sm:flex items-center gap-1 bg-night-900/70 rounded-lg p-0.5 border border-night-700/40">
                  {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                        playbackSpeed === s
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-night-400 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="text-white hover:text-indigo-400 transition-colors p-1"
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
