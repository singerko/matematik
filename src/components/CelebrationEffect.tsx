import React from 'react';

export type CelebrationVariant = 'hearts' | 'confetti' | 'fireworks';

interface Props {
    variant: CelebrationVariant;
}

type AudioContextConstructor = typeof AudioContext;

type WindowWithWebAudio = Window & typeof globalThis & {
    webkitAudioContext?: AudioContextConstructor;
};

type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    decay: number;
    rotation: number;
    spin: number;
    color: string;
    shape: 'heart' | 'confetti' | 'spark';
};

const colors = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#6366f1', '#a855f7', '#ec4899', '#ffffff'];

const random = (min: number, max: number) => min + Math.random() * (max - min);

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const createFireworkSoundPlayer = () => {
    const audioWindow = window as WindowWithWebAudio;
    const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextClass) return null;

    let audioContext: AudioContext | null = null;

    const getContext = () => {
        audioContext ??= new AudioContextClass();
        if (audioContext.state === 'suspended') {
            void audioContext.resume();
        }
        return audioContext;
    };

    const playCrackle = (context: AudioContext, startAt: number, duration: number, volume: number) => {
        const sampleCount = Math.floor(context.sampleRate * duration);
        const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < sampleCount; i++) {
            const fade = 1 - i / sampleCount;
            data[i] = (Math.random() * 2 - 1) * fade * fade;
        }

        const noise = context.createBufferSource();
        const gain = context.createGain();
        const filter = context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(900, startAt);
        gain.gain.setValueAtTime(volume, startAt);
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
        noise.buffer = buffer;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        noise.start(startAt);
        noise.stop(startAt + duration);
    };

    const playBoom = (context: AudioContext, startAt: number, volume: number) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(115, startAt);
        oscillator.frequency.exponentialRampToValueAtTime(42, startAt + 0.42);
        gain.gain.setValueAtTime(volume, startAt);
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.55);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + 0.58);
    };

    return {
        playBurst(force: number) {
            try {
                const context = getContext();
                const now = context.currentTime;
                const volume = Math.min(0.18, 0.07 + force * 0.015);
                playBoom(context, now, volume);
                playCrackle(context, now + 0.05, 0.46, Math.min(0.13, volume * 0.82));
                playCrackle(context, now + 0.18, 0.34, Math.min(0.08, volume * 0.55));
            } catch {
                // Audio can be blocked by the platform; the visual celebration should still run.
            }
        },
        close() {
            if (audioContext) {
                void audioContext.close();
                audioContext = null;
            }
        },
    };
};

const drawHeart = (ctx: CanvasRenderingContext2D, size: number) => {
    const scale = size / 28;
    ctx.beginPath();
    ctx.moveTo(0, 8 * scale);
    ctx.bezierCurveTo(-18 * scale, -7 * scale, -9 * scale, -18 * scale, 0, -9 * scale);
    ctx.bezierCurveTo(9 * scale, -18 * scale, 18 * scale, -7 * scale, 0, 8 * scale);
    ctx.closePath();
};

const createBurst = (
    particles: Particle[],
    variant: CelebrationVariant,
    x: number,
    y: number,
    force: number,
) => {
    const count = variant === 'hearts' ? 56 : variant === 'confetti' ? 120 : 96;
    const shape: Particle['shape'] = variant === 'hearts' ? 'heart' : variant === 'confetti' ? 'confetti' : 'spark';

    for (let i = 0; i < count; i++) {
        const angle = random(0, Math.PI * 2);
        const speed = random(1.2, force);
        particles.push({
            x: x + random(-10, 10),
            y: y + random(-10, 10),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - random(1.2, 5.4),
            size: variant === 'hearts' ? random(10, 24) : variant === 'confetti' ? random(7, 18) : random(1.2, 3.4),
            alpha: random(0.78, 1),
            decay: variant === 'confetti' ? random(0.006, 0.011) : random(0.01, 0.018),
            rotation: random(0, Math.PI * 2),
            spin: random(-0.24, 0.24),
            color: variant === 'fireworks' ? `hsl(${random(0, 360)}, 95%, ${random(58, 76)}%)` : pick(colors),
            shape,
        });
    }
};

const CelebrationEffect: React.FC<Props> = ({ variant }) => {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        let width = 0;
        let height = 0;
        let raf = 0;
        let running = true;
        const particles: Particle[] = [];
        const startedAt = performance.now();
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const sound = variant === 'fireworks' ? createFireworkSoundPlayer() : null;

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const launch = () => {
            if (variant === 'confetti') {
                createBurst(particles, variant, width * 0.24, height * 0.22, 6.2);
                createBurst(particles, variant, width * 0.76, height * 0.22, 6.2);
                createBurst(particles, variant, width * 0.5, height * 0.16, 5.4);
                return;
            }

            if (variant === 'fireworks') {
                createBurst(particles, variant, width * 0.25, height * 0.35, 5.8);
                sound?.playBurst(5.8);
                createBurst(particles, variant, width * 0.5, height * 0.25, 6.7);
                window.setTimeout(() => sound?.playBurst(6.7), 120);
                createBurst(particles, variant, width * 0.75, height * 0.38, 5.8);
                window.setTimeout(() => sound?.playBurst(5.8), 240);
                return;
            }

            createBurst(particles, variant, width * 0.5, height * 0.35, 5.8);
            createBurst(particles, variant, width * 0.32, height * 0.46, 4.6);
            createBurst(particles, variant, width * 0.68, height * 0.46, 4.6);
        };

        const draw = (now: number) => {
            if (!running) return;

            const elapsed = now - startedAt;
            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = variant === 'fireworks' ? 'lighter' : 'source-over';

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= variant === 'confetti' ? 0.988 : 0.982;
                p.vy = p.vy * (variant === 'confetti' ? 0.988 : 0.982) + (variant === 'fireworks' ? 0.035 : 0.075);
                p.alpha -= p.decay;
                p.rotation += p.spin;

                if (p.alpha <= 0 || p.y > height + 80) {
                    particles.splice(i, 1);
                    continue;
                }

                ctx.save();
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.strokeStyle = p.color;

                if (p.shape === 'heart') {
                    drawHeart(ctx, p.size);
                    ctx.fill();
                } else if (p.shape === 'confetti') {
                    const flip = Math.max(1, Math.abs(Math.cos(p.rotation)) * p.size * 0.45);
                    ctx.fillRect(-p.size / 2, -flip / 2, p.size, flip);
                } else {
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = p.size * 5;
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }

            if (elapsed < 1150 && Math.floor(elapsed / 260) !== Math.floor((elapsed - 16) / 260)) {
                const x = random(width * 0.18, width * 0.82);
                const y = random(height * 0.18, height * 0.48);
                const force = variant === 'fireworks' ? 6.2 : 4.8;
                createBurst(particles, variant, x, y, force);
                if (variant === 'fireworks') sound?.playBurst(force);
            }

            if (elapsed > 5200 && particles.length === 0) {
                running = false;
                return;
            }

            raf = requestAnimationFrame(draw);
        };

        resize();
        launch();
        raf = requestAnimationFrame(draw);
        window.addEventListener('resize', resize);

        return () => {
            running = false;
            cancelAnimationFrame(raf);
            sound?.close();
            window.removeEventListener('resize', resize);
        };
    }, [variant]);

    return <canvas className="celebration-canvas" ref={canvasRef} aria-hidden="true" />;
};

export default CelebrationEffect;
