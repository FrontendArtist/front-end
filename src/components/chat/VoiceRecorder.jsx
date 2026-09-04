'use client';

/**
 * @file src/components/chat/VoiceRecorder.jsx
 * @description کامپوننت ضبط فوق‌پیشرفته و شفاف وویس با کیفیت استودیویی (HD 128kbps)
 * 
 * ویژگی‌ها:
 *  - کیفیت ضبط شفاف با بیت‌ریت 128kbps و سرعت طبیعی 1x
 *  - استریم مجزا برای Web Audio Visualizer بدون دستکاری Sample Rate ضبط
 *  - پشتیبانی از Pause / Resume، Discard و Preview
 *  - آزادسازی کامل منابع و استریم‌های صوتی
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import VoicePlayer from './VoicePlayer';
import styles from './VoiceRecorder.module.scss';

function formatTimer(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function getSupportedMimeType() {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return '';
    const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
        'audio/aac',
        'audio/wav',
    ];
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return '';
}

export default function VoiceRecorder({ onSendVoice, onCancel, isSending = false }) {
    // 'idle' | 'recording' | 'paused' | 'preview'
    const [recordState, setRecordState] = useState('idle');
    const [recordDuration, setRecordDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [visualizerLevels, setVisualizerLevels] = useState(new Array(18).fill(15));

    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const visualizerStreamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animFrameRef = useRef(null);

    // پاکسازی کامل منابع صوتی و میکروفون
    const cleanupStream = useCallback(() => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
        if (visualizerStreamRef.current) {
            visualizerStreamRef.current.getTracks().forEach((t) => t.stop());
            visualizerStreamRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    }, []);

    // شروع فرآیند ضبط صدا با کیفیت HD و سرعت طبیعی
    const startRecording = useCallback(async () => {
        setErrorMessage(null);
        audioChunksRef.current = [];

        try {
            if (!navigator?.mediaDevices?.getUserMedia) {
                throw new Error('مرورگر شما از قابلیت ضبط صدا پشتیبانی نمی‌کند.');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                },
            });
            streamRef.current = stream;

            // ⚠️ ایجاد استریم کلون‌شده مستقل برای ویژوالایزر تا سمپل ریت و ساعت ضبط MediaRecorder دستکاری نشود
            try {
                const visualizerStream = stream.clone();
                visualizerStreamRef.current = visualizerStream;

                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                const audioCtx = new AudioCtx();
                const source = audioCtx.createMediaStreamSource(visualizerStream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 64;
                analyser.smoothingTimeConstant = 0.8;
                source.connect(analyser);

                audioContextRef.current = audioCtx;
                analyserRef.current = analyser;

                const dataArray = new Uint8Array(analyser.frequencyBinCount);

                const updateVisualizer = () => {
                    if (!analyserRef.current) return;
                    analyserRef.current.getByteFrequencyData(dataArray);

                    const bars = [];
                    const step = Math.max(1, Math.floor(dataArray.length / 18));
                    for (let i = 0; i < 18; i++) {
                        const val = dataArray[i * step] || 0;
                        const percent = Math.min(100, Math.max(15, (val / 255) * 100));
                        bars.push(percent);
                    }
                    setVisualizerLevels(bars);
                    animFrameRef.current = requestAnimationFrame(updateVisualizer);
                };
                updateVisualizer();
            } catch (e) {
                console.warn('Web Audio visualizer warning:', e);
            }

            // تنظیم بیت‌ریت بالا (128kbps) برای صدای شفاف و فرمت سازگار
            const mimeType = getSupportedMimeType();
            const options = {
                audioBitsPerSecond: 128000,
            };
            if (mimeType) {
                options.mimeType = mimeType;
            }

            const recorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                cleanupStream();

                if (audioChunksRef.current.length === 0) {
                    setErrorMessage('هیچ صدایی ثبت نشد.');
                    setRecordState('idle');
                    return;
                }

                const finalType = recorder.mimeType || mimeType || 'audio/webm';
                const blob = new Blob(audioChunksRef.current, finalType ? { type: finalType } : {});
                
                if (blob.size === 0) {
                    setErrorMessage('فایل صوتی ضبط‌شده خالی است.');
                    setRecordState('idle');
                    return;
                }

                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
                setRecordState('preview');
            };

            // شروع پیوسته و یکپارچه ضبط
            recorder.start();
            setRecordState('recording');
            setRecordDuration(0);

            // تایمر ضبط
            timerIntervalRef.current = setInterval(() => {
                setRecordDuration((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Error starting audio recording:', err);
            let msg = 'خطا در دسترسی به میکروفون.';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg = 'دسترسی به میکروفون مسدود شده است. لطفاً در تنظیمات مرورگر اجازه ضبط صدا را فعال کنید.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                msg = 'میکروفونی بر روی دستگاه شما یافت نشد.';
            }
            setErrorMessage(msg);
            setRecordState('idle');
        }
    }, [cleanupStream]);

    // شروع خودکار ضبط در زمان باز شدن کامپوننت
    useEffect(() => {
        startRecording();
        return () => {
            cleanupStream();
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [startRecording]);

    const handlePauseResume = () => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) return;

        if (recordState === 'recording') {
            recorder.pause();
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            setRecordState('paused');
        } else if (recordState === 'paused') {
            recorder.resume();
            timerIntervalRef.current = setInterval(() => {
                setRecordDuration((prev) => prev + 1);
            }, 1000);
            setRecordState('recording');
        }
    };

    const handleStopToPreview = () => {
        const recorder = mediaRecorderRef.current;
        if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
            try {
                recorder.requestData();
            } catch (e) {
                // Ignore if not supported in current state
            }
            recorder.stop();
        }
    };

    const handleDiscard = () => {
        cleanupStream();
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setAudioBlob(null);
        setPreviewUrl(null);
        setRecordState('idle');
        if (onCancel) onCancel();
    };

    const handleSend = async () => {
        if (!audioBlob || isSending) return;
        if (onSendVoice) {
            await onSendVoice(audioBlob, recordDuration);
        }
    };

    return (
        <div className={styles.recorderContainer}>
            {errorMessage ? (
                <div className={styles.errorBanner}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p>{errorMessage}</p>
                    <button type="button" onClick={handleDiscard} className={styles.errorBtn}>
                        بستن
                    </button>
                </div>
            ) : recordState === 'preview' ? (
                /* ─── حالت پیش‌نمایش قبل از ارسال ─── */
                <div className={styles.previewMode}>
                    <div className={styles.previewPlayerWrap}>
                        {previewUrl && (
                            <VoicePlayer audioUrl={previewUrl} duration={recordDuration} isSelf compact />
                        )}
                    </div>

                    <div className={styles.previewActions}>
                        <button
                            type="button"
                            className={styles.discardBtn}
                            onClick={handleDiscard}
                            title="حذف و انصراف"
                            disabled={isSending}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span>حذف</span>
                        </button>

                        <button
                            type="button"
                            className={styles.sendBtn}
                            onClick={handleSend}
                            disabled={isSending}
                        >
                            {isSending ? (
                                <span className={styles.spinner} aria-hidden="true" />
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13" />
                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                    <span>ارسال وویس</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                /* ─── حالت در حال ضبط زنده ─── */
                <div className={styles.recordingMode}>
                    {/* نشانگر چشمک‌زن ضبط و تایمر */}
                    <div className={styles.recordingTimerWrap}>
                        <span className={`${styles.recDot} ${recordState === 'recording' ? styles['recDot--pulsing'] : styles['recDot--paused']}`} />
                        <span className={styles.timerText}>{formatTimer(recordDuration)}</span>
                    </div>

                    {/* ویژوالایزر زنده موج صدا */}
                    <div className={styles.visualizerWrap}>
                        {visualizerLevels.map((lvl, idx) => (
                            <span
                                key={idx}
                                className={styles.visualizerBar}
                                style={{
                                    height: recordState === 'paused' ? '20%' : `${lvl}%`,
                                }}
                            />
                        ))}
                    </div>

                    {/* دکمه‌های کنترلی ضبط */}
                    <div className={styles.recordControls}>
                        {/* دکمه حذف/لغو */}
                        <button
                            type="button"
                            className={styles.controlIconBtn}
                            onClick={handleDiscard}
                            title="لغو ضبط"
                            aria-label="لغو ضبط"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                        </button>

                        {/* دکمه توقف موقت / ادامه */}
                        <button
                            type="button"
                            className={styles.controlIconBtn}
                            onClick={handlePauseResume}
                            title={recordState === 'recording' ? 'توقف موقت' : 'ادامه ضبط'}
                            aria-label={recordState === 'recording' ? 'توقف موقت' : 'ادامه ضبط'}
                        >
                            {recordState === 'recording' ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="6" y="4" width="4" height="16" rx="1" />
                                    <rect x="14" y="4" width="4" height="16" rx="1" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                            )}
                        </button>

                        {/* دکمه اتمام ضبط و ورود به پیش‌نمایش */}
                        <button
                            type="button"
                            className={styles.stopDoneBtn}
                            onClick={handleStopToPreview}
                            title="اتمام ضبط و بررسی"
                            aria-label="اتمام ضبط"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="5" y="5" width="14" height="14" rx="2" />
                            </svg>
                            <span>پایان ضبط</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
