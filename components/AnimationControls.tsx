'use client';

import { useRef } from 'react';
import { Play, Pause, SkipBack } from 'lucide-react';
import { formatDuration } from '@/lib/strategyUtils';

interface AnimationControlsProps {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
}

const SPEEDS = [0.5, 1, 1.5, 2];

export default function AnimationControls({
  duration,
  currentTime,
  isPlaying,
  playbackSpeed,
  onPlay,
  onPause,
  onSeek,
  onSpeedChange,
}: AnimationControlsProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  const seekFromPointer = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  const handleTrackPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromPointer(e.clientX);
  };

  const handleTrackPointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    seekFromPointer(e.clientX);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#080e0c] border-t border-[#1a2d22] flex-shrink-0 h-13">
      {/* Rewind */}
      <button
        onClick={() => { onSeek(0); }}
        className="text-[#5a7a64] hover:text-white transition-colors flex-shrink-0"
        title="Restart"
      >
        <SkipBack size={15} />
      </button>

      {/* Play / Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        className="w-8 h-8 rounded-full bg-[#22c55e] hover:bg-[#16a34a] flex items-center justify-center transition-colors flex-shrink-0 shadow-lg shadow-green-900/40"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause size={14} className="text-black" fill="black" />
        ) : (
          <Play size={14} className="text-black ml-0.5" fill="black" />
        )}
      </button>

      {/* Time label */}
      <span className="text-[11px] font-mono text-[#5a7a64] w-9 text-right flex-shrink-0">
        {formatDuration(currentTime)}
      </span>

      {/* Scrubber track */}
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handleTrackPointerMove}
        className="flex-1 h-1.5 bg-[#1a2d22] rounded-full cursor-pointer relative group"
      >
        {/* Filled portion */}
        <div
          className="h-full bg-[#22c55e] rounded-full"
          style={{ width: `${progress * 100}%`, transition: 'none' }}
        />
        {/* Thumb knob */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow"
          style={{ left: `${progress * 100}%` }}
        />
      </div>

      {/* Total time */}
      <span className="text-[11px] font-mono text-[#3a5a44] w-9 flex-shrink-0">
        {formatDuration(duration)}
      </span>

      {/* Speed buttons */}
      <div className="flex gap-0.5 flex-shrink-0">
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-1.5 py-0.5 text-[10px] font-black rounded transition-colors ${
              playbackSpeed === s
                ? 'bg-[#22c55e] text-black'
                : 'text-[#5a7a64] hover:text-white'
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
