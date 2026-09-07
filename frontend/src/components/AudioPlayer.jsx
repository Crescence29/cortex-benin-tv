import { useEffect, useRef, useState } from 'react';
import { IconPlay } from './Icons';
import './AudioPlayer.css';

export function isAudioUrl(url = '') {
  return /\.(mp3|m4a|wav|ogg|oga|aac|flac)(\?.*)?$/i.test(url);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AudioPlayer({ src, title, cover }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
  }, [src]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  }

  function onSeek(e) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  }

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div className="ap-player">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
      />
      <div className="ap-player__top">
        {cover ? (
          <img src={cover} alt="" className="ap-player__cover" />
        ) : (
          <div className="ap-player__cover ap-player__cover--placeholder" />
        )}
        <div className="ap-player__info">
          {title && <span className="ap-player__title">{title}</span>}
          <button type="button" className="ap-player__playbtn" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Lecture'}>
            {playing ? <span className="ap-player__pauseicon" /> : <IconPlay />}
          </button>
        </div>
      </div>
      <div className="ap-player__bar" onClick={onSeek}>
        <div className="ap-player__bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="ap-player__times">
        <span>{formatTime(current)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
