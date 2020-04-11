import { GaimaInitCommand } from './app.init.js';
import { GaimaTypeCommand } from './app.type.js';
import { GaimaGalleryCommand } from './app.gallery.js';

export class GaimaApp {

  constructor(configManager) {
    this.init = new GaimaInitCommand(configManager);
    this.type = new GaimaTypeCommand(configManager);
    this.gallery = new GaimaGalleryCommand(configManager);
  }

}
