import { Component, HostListener  } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { MediaService } from './media.service';
import { PlayerService } from './player.service';

export enum KEY_CODE {
  ENTER = 'Enter',
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  private uuid: string = '';

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private router: Router,
    private mediaService: MediaService,
    private playerService: PlayerService
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    //console.log(event);

    if (event.key === KEY_CODE.ENTER) {
      this.playerService.isExternControlled((isExternControlled) => {
        this.mediaService.getMediaFromUuid(this.uuid).subscribe(media => {
          if (media) {
            this.uuid = '';

            const navigationExtras: NavigationExtras = {
              state: {
                media: media,
                isExternControlled,
              }
            };
            this.router.navigate(['/player'], navigationExtras);
          }
        })
        this.mediaService.publishCachedMedia();
      });
    } else {
      switch(event.key) {
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          this.uuid = this.uuid + event.key;
          break;
        default:
          this.uuid = '';
          break;
      }

    }

  }
}
