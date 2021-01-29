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
  media: Media = { type: '' };
  cover = '';
  playing = true;

  loadSavedPlayStateId?: string;
  isExternControlled: boolean = false;

  constructor(private route: ActivatedRoute, private router: Router, private artworkService: ArtworkService, private playerService: PlayerService) {
    this.route.queryParams.subscribe(params => {
      const state = this.router.getCurrentNavigation().extras.state;
      if (state) {
        if (state.isExternControlled === true) {
          this.isExternControlled = true;
          this.media = { title: '', type: 'extern' };
        } else {
          this.media = state.media;
          this.loadSavedPlayStateId = state.loadSavedPlayStateId;

          if (this.loadSavedPlayStateId && !this.media && !this.isExternControlled) {
            this.media = this.playerService.getSavedPlayState(this.loadSavedPlayStateId)?.media;
          }
        }
      }
    });
  }

  ngOnInit() {
    if (!this.isExternControlled)
      this.artworkService.getArtwork(this.media).subscribe(url => {
        this.cover = url;
      });
  }

  ionViewWillEnter() {
    if (!this.isExternControlled) {
      if (this.loadSavedPlayStateId) {
        this.playerService.loadPlayState(this.loadSavedPlayStateId);
      } else if (this.media) {
        this.playerService.playMedia(this.media);
      }
    }
  }

  ionViewWillLeave() {
    if (!this.isExternControlled) this.playerService.sendCmd(PlayerCmds.PAUSE);
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
