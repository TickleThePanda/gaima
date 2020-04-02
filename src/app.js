import { GaimaInitCommand } from './app.init.js';

export class GaimaApp {

  constructor(configManager) {
    this.init = new GaimaInitCommand(configManager);
  }

}
