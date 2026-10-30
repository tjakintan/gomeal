import { MessageType } from "@/types/messages.types";


export const sanitize_voice_meta = (
    message_type: MessageType,
    duration_ms?: number | null,
    waveform?: number[] | null
): { duration_ms: number | null; waveform: number[] | null } => {

    if (message_type !== "voice") {
        return { duration_ms: null, waveform: null };
    }

    const safe_duration =
        Number.isFinite(duration_ms) && duration_ms! > 0
            ? Math.min(Math.round(duration_ms!), 60 * 60 * 1000)
            : null;

    const safe_waveform =
        Array.isArray(waveform) && waveform.length > 0
            ? waveform
                  .slice(0, 64)
                  .map((v) =>
                      Math.max(0, Math.min(100, Math.round(Number(v) || 0)))
                  )
            : null;

    return {
        duration_ms: safe_duration,
        waveform: safe_waveform,
    };
};