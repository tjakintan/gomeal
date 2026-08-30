from __future__ import annotations

from collections import deque

import numpy as np
import sounddevice as sd

from chefNex.audio.voice_activity_detector import (
    VoiceActivityDetector,
)


class VoiceInput:

    def __init__(
        self,
        samplerate: int = 16000,
        blocksize: int = 512,

        start_threshold: float = 0.6,
        stop_threshold: float = 0.3,

        preroll_ms: int = 300,
        silence_ms: int = 900,

        min_speech_ms: int = 300,
        max_seconds: int = 30,
    ):

        self.samplerate = samplerate
        self.blocksize = blocksize

        self.start_threshold = start_threshold
        self.stop_threshold = stop_threshold

        self.vad = VoiceActivityDetector(
            samplerate
        )


        self.preroll_blocks = int(
            preroll_ms / 1000
            *
            samplerate
            /
            blocksize
        )


        self.silence_blocks = int(
            silence_ms / 1000
            *
            samplerate
            /
            blocksize
        )


        self.min_speech_blocks = int(
            min_speech_ms / 1000
            *
            samplerate
            /
            blocksize
        )


        self.max_blocks = int(
            max_seconds
            *
            samplerate
            /
            blocksize
        )


    def listen(self):

        print("🎤 Waiting...")


        pre_buffer = deque(
            maxlen=self.preroll_blocks
        )


        audio_frames = []

        started = False

        speech_blocks = 0

        silence_blocks = 0


        with sd.InputStream(
            samplerate=self.samplerate,
            channels=1,
            blocksize=self.blocksize,
            dtype=np.float32,
        ) as stream:


            while True:

                chunk, _ = stream.read(
                    self.blocksize
                )


                chunk = chunk.squeeze()


                probability = (
                    self.vad
                    .speech_probability(chunk)
                )


                pre_buffer.append(chunk)



                # Waiting for speech
                if not started:


                    if probability >= self.start_threshold:

                        print(
                            f"🗣️ Speech started "
                            f"({probability:.2f})"
                        )


                        started = True


                        audio_frames.extend(
                            pre_buffer
                        )


                        speech_blocks += 1


                    continue



                # Already recording

                audio_frames.append(chunk)


                if probability >= self.stop_threshold:

                    speech_blocks += 1

                    silence_blocks = 0


                else:

                    silence_blocks += 1


                    if (
                        silence_blocks
                        >= self.silence_blocks
                    ):
                        break



                if (
                    len(audio_frames)
                    >= self.max_blocks
                ):
                    print(
                        "⚠️ Max recording length"
                    )
                    break



        if speech_blocks < self.min_speech_blocks:

            print(
                "❌ Speech too short"
            )

            return None



        audio = np.concatenate(
            audio_frames
        )


        # Normalize volume
        peak = np.max(
            np.abs(audio)
        )

        if peak > 0:
            audio = audio / peak


        print(
            "✅ Speech captured"
        )


        return audio.astype(
            np.float32
        )