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
}

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private config: Observable<SonosApiConfig> = null;

  private currentPlayingMedia: Media | undefined;
  private saveState: Record<string, { media: Media; trackNo: number; elapsedTime: number }> = {};

  constructor(private http: HttpClient) {}

  getSavedPlayState(id: string = 'default') {
    return this.saveState[id];
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

  sendCmd(cmd: PlayerCmds, onComplete?: (data: any) => void) {
    this.sendRequest(cmd, onComplete);
  }

  sendTrackseekCmd(trackseek: number, onComplete?: (data: any) => void) {
    this.sendRequest('trackseek/' + trackseek, onComplete);
  }

  sendTimeseekCmd(timeseek: number, onComplete?: (data: any) => void) {
    this.sendRequest('timeseek /' + timeseek, onComplete);
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
    this.sendRequest(url, onComplete);
  }

  say(text: string) {
    const url = 'say/' + encodeURIComponent(text) + '/de-de';
    this.sendRequest(url);
  }

  savePlayState(id: string = 'default') {
    if (!this.currentPlayingMedia) return;

    this.saveState[id] = {
      media: this.currentPlayingMedia,
      trackNo: 1,
      elapsedTime: 0,
    };

    this.getState(state => {
      this.saveState[id] = {
        media: this.currentPlayingMedia,
        trackNo: state.trackNo,
        elapsedTime: state.elapsedTime,
      };
    });
  }

  loadPlayState(id: string = 'default') {
    const savedData = this.saveState[id];

    this.playMedia(savedData.media, () => this.sendTrackseekCmd(savedData.trackNo, () => this.sendTimeseekCmd(savedData.elapsedTime)));
  }

  private sendRequest(url: string, onComplete: (data: any) => void = () => undefined) {
    this.getConfig().subscribe(config => {
      const baseUrl = 'http://' + config.server + ':' + config.port + '/' + config.rooms[0] + '/';
      this.http.get(baseUrl + url).subscribe(onComplete);
    });
  }
}
