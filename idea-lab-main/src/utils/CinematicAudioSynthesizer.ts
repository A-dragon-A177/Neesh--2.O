// Audio Synthesizer - Sounds disabled per user request
class CinematicAudioSynthesizer {
  public toggleMute(): boolean {
    return true;
  }

  public getMuted(): boolean {
    return true;
  }

  public setVolume(_val: number) {}

  public playSubBassDrop() {}

  public playLaserPulse() {}

  public playWarpBoom() {}

  public playHoloBeep(_pitch?: number) {}

  public toggleAmbientDrone(): boolean {
    return false;
  }
}

export const soundFx = new CinematicAudioSynthesizer();
