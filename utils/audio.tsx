export const WAVEFORM = [
    8, 12, 17, 24, 15, 10, 21, 27,
    18, 9, 13, 23, 30, 19, 11, 7,
    14, 25, 17, 10, 20, 28, 15, 8,
    12, 22, 29, 18, 10, 16, 25, 13,
    8, 11, 20, 27, 16, 9, 14, 23,
    30, 19, 12, 8, 18, 26, 15, 10,
    21, 28, 17, 9, 13, 24, 19, 11,
];


export const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${minutes}:${remaining
        .toString()
        .padStart(2, "0")}`;
};

export const BAR_COUNT = 48;
const MIN_DB = -50;   // at or below this = silence (flat line)
export const MIN_H = 3;      // bar height when quiet
export const MAX_H = 30;

// metering is in dB: about -160 (silence) up to 0 (max)
export const dbToLevel = (db: number) => {
    const clamped = Math.max(MIN_DB, Math.min(0, db));
    const linear = (clamped - MIN_DB) / -MIN_DB;   // 0..1
    return Math.pow(linear, 1.6);                  // suppress low-level noise
};

export const levelToHeight = (level: number) => MIN_H + level * (MAX_H - MIN_H);

export const flatBars = () => Array<number>(BAR_COUNT).fill(0);

// Live view: newest sample on the right, older ones scroll left
export const padLive = (samples: number[]) => {
    const tail = samples.slice(-BAR_COUNT);
    return [...Array(BAR_COUNT - tail.length).fill(0), ...tail];
};

export const seededBars = (seed: number) => {
    let s = seed || 1;
    return Array.from({ length: BAR_COUNT }, () => {
        s = (s * 9301 + 49297) % 233280;
        return 0.25 + (s / 233280) * 0.75;
    });
};

export const resample = (samples: number[], count = BAR_COUNT) => {
    if (samples.length === 0) return Array(count).fill(0);
    return Array.from({ length: count }, (_, i) => {
        const start = Math.floor((i * samples.length) / count);
        const end = Math.max(
            start + 1,
            Math.floor(((i + 1) * samples.length) / count)
        );
        let peak = 0;
        for (let j = start; j < end && j < samples.length; j++) {
            peak = Math.max(peak, samples[j]);
        }
        return peak;
    });
};

// 0..1 levels -> 32 ints (0-100) for the server
export const toWaveform = (samples: number[]) =>
    resample(samples, 32).map((v) => Math.round(v * 100));
