import { EOL } from "os";
import { ConfigManager } from "./config-manager.js";

export type GalleryCreateCommandArgs = {
  name: string;
  description: string;
};

export type GalleryUpdateCommandArgs = {
  name: string;
  description: string;
};

export type GalleryRemoveCommandArgs = {
  name: string;
};

export class GaimaGalleryCommand {
  configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  create({ name, description }: GalleryCreateCommandArgs) {
    this.configManager.addGallery({
      name,
      description,
    });
  }

  list() {
    const galleries = this.configManager.getGalleries();

    console.log(galleries.map(formatGallery).join(EOL));
  }

  set({ name, description }: GalleryUpdateCommandArgs) {
    this.configManager.setGallery(name, {
      description,
    });
  }

  remove({ name }: GalleryRemoveCommandArgs) {
    this.configManager.removeGallery(name);
  }
}

function formatGallery({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return description !== undefined ? `${name} - ${description}` : `${name}`;
}
