import { EOL } from "os";
import { ConfigManager } from "./config-manager.js";

export class GaimaGalleryCommand {
  configManager: ConfigManager;

  constructor(configManager) {
    this.configManager = configManager;
  }

  create({ name, description }) {
    this.configManager.addGallery({
      name,
      description,
    });
  }

  list() {
    const galleries = this.configManager.getGalleries();

    console.log(galleries.map(formatGallery).join(EOL));
  }

  set({ name, description }) {
    this.configManager.setGallery(name, {
      description,
    });
  }

  remove({ name }) {
    this.configManager.removeGallery({ name });
  }
}

function formatGallery({ name, description }) {
  return description !== undefined ? `${name} - ${description}` : `${name}`;
}
