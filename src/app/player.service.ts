import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Media } from './media';
import { SonosApiConfig, SonosApiState, SonosApiQueue } from './sonos-api';
import { environment } from '../environments/environment';
import { Observable, throwError } from 'rxjs';
import { publishReplay, refCount, retry, catchError } from 'rxjs/operators';

export enum PlayerCmds {
  PLAY = 'play',
  PAUSE = 'pause',
  PLAYPAUSE = 'playpause',
  PREVIOUS = 'previous',
  NEXT = 'next',
  VOLUMEUP = 'volume/+5',
  VOLUMEDOWN = 'volume/-5',
  CLEARQUEUE = 'clearqueue',
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
        catchError(this.handleError),
      );
    }

    return this.config;
  }

  getState(onComplete?: (state: SonosApiState) => void) {
    this.sendRequest('state', onComplete);
  }

  getQueue({ limit, offset, detailed }: { limit?: number; offset?: number; detailed?: boolean } = {}, onComplete?: (queue: SonosApiQueue[]) => void) {
    let cmd = 'queue';
    if (limit) cmd = cmd + '/' + limit;
    if (limit && offset) cmd = cmd + '/' + offset;
    if (detailed) cmd = cmd + '/detailed';

    this.sendRequest(cmd, onComplete);
  }

  // if you are using AirPlay and not the desired album is played rather Airplay plays the next titel, so better do nothing.
  // I have not found a way to stop Airplay, but if Airplay is used state.nextTrack is undefined, atherwise it is an emoty string, and we can us this to detect Airplay playing.
  isExternControlled(onComplete?: (isExternControlled: boolean) => void) {
    this.getState(state => {
      if (state.nextTrack.title === undefined) onComplete(true);
      else onComplete(false);
    });
  }

  sendCmd(cmd: PlayerCmds, onComplete?: (data?: any) => void) {
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

    // sending command adds the album to the queue, but then the trackNr is not correct, so clear the queue first
    this.sendCmd(PlayerCmds.CLEARQUEUE, () => this.sendRequest(url, onComplete));
  }

  say(text: string) {
    this.getConfig().subscribe(config => {
      let url = 'say/' + encodeURIComponent(text) + '/' + (config.tts?.language?.length > 0 ? config.tts.language : 'de-de');

      if (config.tts?.volume?.length > 0) {
        url += '/' + config.tts.volume;
      }

      this.sendRequest(url);
    });
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
      this.http
        .get(baseUrl + url)
        .pipe(retry(1), catchError(this.handleError))
        .subscribe(onComplete);
    });
  }

  private handleError(error) {
    let errorMessage = '';

    if (error.error instanceof ErrorEvent) {
      // client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    console.error(errorMessage);

    return throwError(errorMessage);
  }
}
