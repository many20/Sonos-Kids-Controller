import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ArtworkService } from '../artwork.service';
import { PlayerService, PlayerCmds } from '../player.service';
import { Media } from '../media';

@Component({
  selector: 'app-player',
  templateUrl: './player.page.html',
  styleUrls: ['./player.page.scss'],
})
export class PlayerPage implements OnInit {
  media?: Media;
  cover = '';
  playing = true;

  loadSavedPlayStateId?: string;
  isAirPlayPlaying: boolean = false;

  constructor(private route: ActivatedRoute, private router: Router, private artworkService: ArtworkService, private playerService: PlayerService) {
    this.route.queryParams.subscribe(params => {
      const state = this.router.getCurrentNavigation().extras.state;
      if (state) {
        this.media = state.media;
        this.loadSavedPlayStateId = state.loadSavedPlayStateId;
        if (state.isAirPlayPlaying) this.isAirPlayPlaying = true;

        if (this.loadSavedPlayStateId && !this.media) {
          this.media = this.playerService.getSavedPlayState(this.loadSavedPlayStateId)?.media;
        }
      }
    });
  }

  ngOnInit() {
    if (!this.isAirPlayPlaying) this.artworkService.getArtwork(this.media).subscribe(url => {
      this.cover = url;
    });
  }

  ionViewWillEnter() {
    if (!this.isAirPlayPlaying) {
      if (this.loadSavedPlayStateId) {
        this.playerService.loadPlayState(this.loadSavedPlayStateId);
      } else if (this.media) {
        this.playerService.playMedia(this.media);
      }
    }
  }

  ionViewWillLeave() {
    if (!this.isAirPlayPlaying) this.playerService.sendCmd(PlayerCmds.PAUSE);
  }

  volUp() {
    this.playerService.sendCmd(PlayerCmds.VOLUMEUP);
  }

  volDown() {
    this.playerService.sendCmd(PlayerCmds.VOLUMEDOWN);
  }

  skipPrev() {
    this.playerService.sendCmd(PlayerCmds.PREVIOUS);
  }

  skipNext() {
    this.playerService.sendCmd(PlayerCmds.NEXT);
  }

  playPause() {
    if (this.playing) {
      this.playing = false;
      this.playerService.sendCmd(PlayerCmds.PAUSE);
    } else {
      this.playing = true;
      this.playerService.sendCmd(PlayerCmds.PLAY);
    }
  }

  savePlayState(id: string = 'default') {
    this.playerService.savePlayState(id);
  }
}
