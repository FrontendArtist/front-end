'use client';

/**
 * @file src/components/chat/VoicePlayer.jsx
 * @description پخش‌کننده صوتی مدرن و پیشرفته برای پیام‌های صوتی (وویس)
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '@/lib/api';
import styles from './VoicePlayer.module.scss';

function formatAudioTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function getFullAudioUrl(rawUrl) {
    if (!rawUrl) return '';
    if (typeof rawUrl === 'object') {
        rawUrl = rawUrl.url || rawUrl.src || '';
    }
    if (typeof rawUrl !== 'string') return '';
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';

    if (
        trimmed.startsWith('blob:') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://')
    ) {
        return trimmed;
    }

    const base = (API_BASE_URL || 'http://localhost:1337').replace(/\/+$/, '');
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${base}${path}`;
}

// تولید میله‌های متغیر بر اساس هش رشته برای یکنواختی شکل موج هر فایل
function generateWaveformHeights(url = '', count = 30) {
    const str = typeof url === 'string' ? url : 'voice';
    const seed = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 42);
    const heights = [];
    for (let i = 0; i < count; i++) {
        // ایجاد منحنی موجی طبیعی
        const wave = Math.sin((i / count) * Math.PI) * 0.4 + 0.3;
        const noise = ((seed * (i + 1) * 9301 + 49297) % 233280) / 233280;
        const h = Math.round(Math.min(100, Math.max(20, (wave + noise * 0.5) * 85)));
        heights.push(h);
    }
    return heights;
}

export default function VoicePlayer({ audioUrl, duration: initialDuration = 0, isSelf = false, compact = false }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(initialDuration);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const audioRef = useRef(null);
    const waveformRef = useRef(null);

    // محاسبه آدرس کامل فایل صوتی
    const fullAudioUrl = useMemo(() => getFullAudioUrl(audioUrl), [audioUrl]);

    const waveformHeights = useMemo(
        () => generateWaveformHeights(fullAudioUrl || 'voice', compact ? 22 : 32),
        [fullAudioUrl, compact]
    );

    // همگام‌سازی و بارگذاری صوتی در تگ audio هنگام تغییر آدرس
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        setIsPlaying(false);
        setCurrentTime(0);

        if (fullAudioUrl) {
            audio.pause();
            audio.src = fullAudioUrl;
            audio.load();
        } else {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
        }
    }, [fullAudioUrl]);

    // به‌روزرسانی اولیه duration در صورت پاس داده شدن
    useEffect(() => {
        if (initialDuration && initialDuration > 0 && !duration) {
            setDuration(initialDuration);
        }
    }, [initialDuration, duration]);

    // کنترل متوقف شدن صوتی هنگام unmount
    useEffect(() => {
        const audio = audioRef.current;
        return () => {
            if (audio) {
                audio.pause();
                audio.removeAttribute('src');
            }
        };
    }, []);

    const togglePlay = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio || !fullAudioUrl) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            try {
                setIsLoading(true);
                if (!audio.src || (audio.src !== fullAudioUrl && !audio.src.endsWith(fullAudioUrl))) {
                    audio.src = fullAudioUrl;
                    audio.load();
                }
                await audio.play();
                setIsPlaying(true);
            } catch (err) {
                console.error('Audio play error:', err);
                setIsPlaying(false);
            } finally {
                setIsLoading(false);
            }
        }
    }, [isPlaying, fullAudioUrl]);

    const handleLoadedMetadata = () => {
        const audio = audioRef.current;
        if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            setDuration(audio.duration);
        }
    };

    const handleTimeUpdate = () => {
        const audio = audioRef.current;
        if (audio) {
            setCurrentTime(audio.currentTime);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
        }
    };

    const handleSpeedChange = () => {
        const speeds = [1, 1.5, 2];
        const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
        const nextSpeed = speeds[nextIndex];
        setPlaybackRate(nextSpeed);
        if (audioRef.current) {
            audioRef.current.playbackRate = nextSpeed;
        }
    };

    const handleSeek = (e) => {
        if (!waveformRef.current || !duration || !isFinite(duration)) return;
        const rect = waveformRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        // در چت راست به چپ (RTL)، پیشرفت از راست به چپ حرکت می‌کند
        const clickPos = rect.right - clientX;
        const percentage = Math.max(0, Math.min(1, clickPos / rect.width));
        const newTime = percentage * duration;

        setCurrentTime(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={`${styles.voicePlayer} ${isSelf ? styles['voicePlayer--self'] : styles['voicePlayer--other']} ${compact ? styles['voicePlayer--compact'] : ''}`}>
            <audio
                ref={audioRef}
                preload="metadata"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onWaiting={() => setIsLoading(true)}
                onPlaying={() => setIsLoading(false)}
                onError={() => {
                    setIsLoading(false);
                    setIsPlaying(false);
                }}
            />

            {/* دکمه Play / Pause */}
            <button
                type="button"
                className={styles.playBtn}
                onClick={togglePlay}
                disabled={!fullAudioUrl || isLoading}
                aria-label={isPlaying ? 'توقف پخش وویس' : 'پخش وویس'}
            >
                {isLoading ? (
                    <span className={styles.spinner} aria-hidden="true" />
                ) : isPlaying ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1.5" />
                        <rect x="14" y="4" width="4" height="16" rx="1.5" />
                    </svg>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '-2px' }}>
                        <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                )}
            </button>

            {/* موج صوتی و تایمر */}
            <div className={styles.body}>
                <div
                    ref={waveformRef}
                    className={styles.waveform}
                    onClick={handleSeek}
                    role="slider"
                    aria-label="موقعیت پخش وویس"
                    aria-valuemin={0}
                    aria-valuemax={duration || 100}
                    aria-valuenow={currentTime}
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowRight') {
                            const nt = Math.max(0, currentTime - 5);
                            setCurrentTime(nt);
                            if (audioRef.current) audioRef.current.currentTime = nt;
                        } else if (e.key === 'ArrowLeft') {
                            const nt = Math.min(duration, currentTime + 5);
                            setCurrentTime(nt);
                            if (audioRef.current) audioRef.current.currentTime = nt;
                        } else if (e.key === ' ') {
                            e.preventDefault();
                            togglePlay();
                        }
                    }}
                >
                    {waveformHeights.map((height, idx) => {
                        const barPercent = (idx / waveformHeights.length) * 100;
                        const isFilled = barPercent <= progressPercent;
                        return (
                            <span
                                key={idx}
                                className={`${styles.waveformBar} ${isFilled ? styles['waveformBar--filled'] : ''}`}
                                style={{ height: `${height}%` }}
                            />
                        );
                    })}
                </div>

                <div className={styles.metaRow}>
                    <span className={styles.time}>
                        {isPlaying || currentTime > 0
                            ? formatAudioTime(currentTime)
                            : formatAudioTime(duration)}
                    </span>

                    <button
                        type="button"
                        className={styles.speedBtn}
                        onClick={handleSpeedChange}
                        title="تغییر سرعت پخش"
                        aria-label={`سرعت پخش: ${playbackRate} برابر`}
                    >
                        {playbackRate}x
                    </button>
                </div>
            </div>
        </div>
    );
}
