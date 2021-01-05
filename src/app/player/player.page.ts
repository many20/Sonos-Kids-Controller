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

  constructor(private route: ActivatedRoute, private router: Router, private artworkService: ArtworkService, private playerService: PlayerService) {
    this.route.queryParams.subscribe(params => {
      if (this.router.getCurrentNavigation().extras.state) {
        this.media = this.router.getCurrentNavigation().extras.state.media;
        this.loadSavedPlayStateId = this.router.getCurrentNavigation().extras.state.loadSavedPlayStateId;

        if (this.loadSavedPlayStateId && !this.media) {
          this.media = this.playerService.getSavedPlayState(this.loadSavedPlayStateId)?.media;
        }
      }
    });
  }

  ngOnInit() {
    this.artworkService.getArtwork(this.media).subscribe(url => {
      this.cover = url;
    });
  }

  ionViewWillEnter() {
    if (this.loadSavedPlayStateId) {
      this.playerService.loadPlayState(this.loadSavedPlayStateId);
    } else if (this.media) {
      this.playerService.playMedia(this.media);
    }
  }

  ionViewWillLeave() {
    this.playerService.sendCmd(PlayerCmds.PAUSE);
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
