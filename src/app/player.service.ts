import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Media } from './media';
import { SonosApiConfig, SonosApiState } from './sonos-api';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';
import { publishReplay, refCount } from 'rxjs/operators';

export enum PlayerCmds {
  PLAY = 'play',
  PAUSE = 'pause',
  PLAYPAUSE = 'playpause',
  PREVIOUS = 'previous',
  NEXT = 'next',
  VOLUMEUP = 'volume/+5',
  VOLUMEDOWN = 'volume/-5',
  CLEARQUEUE = 'clearqueue'
}

export interface SaveState {
  id: string;
  media: Media;
  trackNo: number;
  elapsedTime: number;
}

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private config: Observable<SonosApiConfig> = null;

  private currentPlayingMedia: Media | undefined;

  constructor(private http: HttpClient) {}

  getSavedPlayState(id: string = 'default'): SaveState | undefined {
    const saveStateString = window.localStorage.getItem('SavedPlayState');
    if (!saveStateString) return;
    const saveState: Record<string, SaveState> = JSON.parse(saveStateString);
    return saveState[id];
  }

  setSavedPlayState(state: SaveState) {
    let saveState: Record<string, SaveState> = {};
    let saveStateString = window.localStorage.getItem('SavedPlayState');
    if (saveStateString) saveState = JSON.parse(saveStateString);
    saveState[state.id] = state;
    window.localStorage.setItem('SavedPlayState', JSON.stringify(saveState));
  }

  getConfig() {
    // Observable with caching:
    // publishReplay(1) tells rxjs to cache the last response of the request
    // refCount() keeps the observable alive until all subscribers unsubscribed
    if (!this.config) {
      const url = environment.production ? '../api/sonos' : 'http://localhost:8200/api/sonos';

      this.config = this.http.get<SonosApiConfig>(url).pipe(
        publishReplay(1), // cache result
        refCount(),
      );
    }

    return this.config;
  }

  getState(onComplete?: (data: SonosApiState) => void) {
    this.sendRequest('state', onComplete);
  }

  getQueue(onComplete?: (data: SonosApiState) => void) {
    this.sendRequest('queue', onComplete);
  }

  sendCmd(cmd: PlayerCmds, onComplete?: (data: any) => void) {
    this.sendRequest(cmd, onComplete);
  }

  sendTrackseekCmd(trackNumber: number, onComplete?: (data: any) => void) {
    this.sendRequest('trackseek/' + trackNumber, onComplete);
  }

  sendTimeseekCmd(seconds: number, onComplete?: (data: any) => void) {
    this.sendRequest('timeseek/' + seconds, onComplete);
  }

  sendSleepCmd(seconds: number, onComplete?: (data: any) => void) {
    this.sendRequest('sleep/' + seconds, onComplete);
  }

  playMedia(media: Media, onComplete?: (data: any) => void) {
    let url: string;

    switch (media.type) {
      case 'applemusic': {
        url = 'applemusic/now/album:' + encodeURIComponent(media.id);
        break;
      }
      case 'amazonmusic': {
        url = 'amazonmusic/now/album:' + encodeURIComponent(media.id);
        break;
      }
      case 'library': {
        if (!media.id) {
          media.id = media.title;
        }
        url = 'musicsearch/library/album/' + encodeURIComponent(media.id);
        break;
      }
      case 'spotify': {
        // Prefer media.id, as the user can overwrite the artist name with a user-defined string when using an id
        if (media.id) {
          url = 'spotify/now/spotify:album:' + encodeURIComponent(media.id);
        } else {
          url = 'musicsearch/spotify/album/artist:"' + encodeURIComponent(media.artist) + '" album:"' + encodeURIComponent(media.title) + '"';
        }
        break;
      }
    }

    this.currentPlayingMedia = media;

    this.sendCmd(PlayerCmds.CLEARQUEUE, () => this.sendRequest(url, onComplete));
  }

  say(text: string) {
    const url = 'say/' + encodeURIComponent(text) + '/de-de';
    this.sendRequest(url);
  }

  savePlayState(id: string = 'default') {
    if (!this.currentPlayingMedia) return;

    this.setSavedPlayState({
      id,
      media: this.currentPlayingMedia,
      trackNo: 1,
      elapsedTime: 0,
    });

    this.getState(state => {
      this.setSavedPlayState({
        id,
        media: this.currentPlayingMedia,
        trackNo: state.trackNo,
        elapsedTime: state.elapsedTime,
      });
    });
  }

  loadPlayState(id: string = 'default') {
    const state = this.getSavedPlayState(id);

    this.playMedia(state.media, () => this.sendTrackseekCmd(state.trackNo, () => this.sendTimeseekCmd(state.elapsedTime)));
  }

  private sendRequest(url: string, onComplete: (data: any) => void = () => undefined) {
    this.getConfig().subscribe(config => {
      const baseUrl = 'http://' + config.server + ':' + config.port + '/' + config.rooms[0] + '/';
      this.http.get(baseUrl + url).subscribe(onComplete);
    });
  }
}
