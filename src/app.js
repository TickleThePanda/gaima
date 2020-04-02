import { GaimaInitCommand } from './app.init.js';
import { GaimaTypeCommand } from './app.type.js';

export class GaimaApp {

  constructor(configManager) {
    this.init = new GaimaInitCommand(configManager);
    this.type = new GaimaTypeCommand(configManager);
  }

}
