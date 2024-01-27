import { GaimaInitCommand } from './app.init.js';
import { GaimaTypeCommand } from './app.type.js';
import { GaimaGalleryCommand } from './app.gallery.js';
import { GaimaImageCommand } from './app.image.js';
import { GaimaBuildCommand } from './app.build.js';

export class GaimaApp {

  init: any;
  type: any;
  gallery: any;
  image: any;
  build: any;

  constructor(configManager) {
    this.init = new GaimaInitCommand(configManager);
    this.type = new GaimaTypeCommand(configManager);
    this.gallery = new GaimaGalleryCommand(configManager);
    this.image = new GaimaImageCommand(configManager);
    this.build = new GaimaBuildCommand(configManager);
  }

}
