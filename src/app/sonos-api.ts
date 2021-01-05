export interface SonosApiConfig {
  server: string;
  port: string;
  rooms: string[];
}

export interface SonosApiTrack {
  artist: string;
  title: string;
  album: string;
  albumArtURI: string;
  duration: number;
  uri: string;
}
export interface SonosApiState {
  currentTrack: SonosApiTrack;
  nextTrack: SonosApiTrack;
  volume: number;
  mute: boolean;
  trackNo: number;
  elapsedTime: number;
  elapsedTimeFormatted: string;
  zoneState: string;
  playerState: string;
  zonePlayMode: {
    shuffle: boolean;
    repeat: boolean;
    crossfade: boolean;
  };
  equalizer: {
    bass: number;
    treble: number;
    loudness: boolean;
  };
}
