from __future__ import annotations

import numpy as np

from faster_whisper import WhisperModel


class SpeechToText:
    """
    Converts speech audio arrays into text using Faster-Whisper.
    """

    def __init__(
        self,
        model_size: str = "base",
        device: str = "cpu",
        compute_type: str = "int8",
        language: str = "en",
    ):

        self.language = language

        self.model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )


    def transcribe(
        self,
        audio: np.ndarray,
    ) -> str:
        """
        Parameters:
            audio:
                float32 numpy array
                sampled at 16kHz

        Returns:
            Transcribed text
        """

        if audio is None or len(audio) == 0:
            return ""


        segments, info = self.model.transcribe(
            audio,
            language=self.language,

            # Better accuracy
            beam_size=5,

            # Remove remaining silence
            vad_filter=True,

            # Helps short voice commands
            condition_on_previous_text=False,
        )


        text = " ".join(
            segment.text.strip()
            for segment in segments
        )


        return text.strip()