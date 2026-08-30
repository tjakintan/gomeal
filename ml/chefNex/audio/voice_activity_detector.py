from __future__ import annotations

import torch

from silero_vad import load_silero_vad


class VoiceActivityDetector:
    """
        Wrapper around Silero VAD.

        Returns speech probability.
    """

    def __init__(
        self,
        samplerate: int = 16000,
    ):

        self.samplerate = samplerate

        self.model = load_silero_vad()

        self.model.eval()


    def speech_probability(
        self,
        audio_chunk,
    ) -> float:
        """
            Returns:
                float between 0 and 1

            Example:
                0.02 = silence
                0.90 = speech
        """

        if len(audio_chunk) == 0:
            return 0.0


        audio = torch.from_numpy(
            audio_chunk
        ).float()


        with torch.no_grad():

            probability = self.model(
                audio,
                self.samplerate
            )


        return float(probability)