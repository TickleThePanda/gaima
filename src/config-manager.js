export class ConfigManager {
  constructor (config) {
    this.config = config;
  }

  getType(aspectRatio) {
    if (this.config.types !== 'array') {
      return undefined;
    }

    return this.config.types
      .find(t => t.aspectRatio.x === aspectRatio.x
                && t.aspectRatio.y === aspectRatio.y);
  }

  addType(aspectRatio, sizes) {
    if (this.getType(aspectRatio) !== undefined) {
      throw new Error('Aspect ratio ' + arName + ' already exists');
    }

    this.setType(aspectRatio, sizes);
  }

  setType(aspectRatio, sizes) {
    if (typeof this.config.types !== 'array') {
      this.config.types = [];
    }

    const newAspectRatio = { aspectRatio, sizes };

    const existingAspectRatio = this.getType(aspectRatio);

    if (existingAspectRatio === undefined) {
      this.config.types.push(newAspectRatio);
    } else {
      Object.assign(existingAspectRatio, newAspectRatio);
    }
  }

  removeType(aspectRatio) {
    if (typeof this.config.types !== 'array') {
      return;
    }

    this.config.types = this.config.types.filter(
      t => !(t.aspectRatio.x === aspectRatio.x && t.aspectRatio.y === aspectRatio.y)
    );
  }

  getTypes() {
    if (this.config.types === undefined) {
      return [];
    }
    return this.config.types;
  }
}