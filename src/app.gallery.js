import { EOL } from 'os';

export class GaimaGalleryCommand {
  constructor(configManager) {
    this.configManager = configManager;
  }

  create({name, description}) {
    this.configManager.addGallery({
      name, description
    });
  }

  list() {
    const galleries = this.configManager.getGalleries();

    console.log(galleries.map(formatGallery).join(EOL));

  }

  remove({name}) {
    this.configManager.removeGallery({name});
  }
}

function formatGallery({name, description}) {
  return description !== undefined
    ? `${name} - ${description}`
    : `${name}`;
}