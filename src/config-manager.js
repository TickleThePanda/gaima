export class ConfigError extends Error {
  constructor (message) {
    super(message);
  }
}

export class ConfigManager {
  constructor (config) {
    this.config = config;
  }

  getType(aspectRatio) {

    if (this.config.types === undefined) {
      return undefined;
    }
    if (!Array.isArray(this.config.types)) {
      throw new ConfigError(
        `Unrecognised config format "types" was ${typeof this.config.types}, not array`
      );
    }

    return this.config.types
      .find(t => t.aspectRatio.x === aspectRatio.x
                && t.aspectRatio.y === aspectRatio.y);
  }

  addType(aspectRatio, sizes) {
    if (this.getType(aspectRatio) !== undefined) {
      throw new ConfigError('Aspect ratio ' + arName + ' already exists');
    }

    this.setType(aspectRatio, sizes);
  }

  setType(aspectRatio, sizes) {
    if (!Array.isArray(this.config.types)) {
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
    if (this.config.types === undefined) {
      throw new ConfigError("No types to delete");
    }
    if (!Array.isArray(this.config.types)) {
      throw new ConfigError(`Unrecognised config format "types" was ${typeof this.config.types}, not array`)
    }

    const typeToRemove = this.getType(aspectRatio);

    if (typeToRemove === undefined) {
      throw new ConfigError(`Type ${aspectRatio} could not be found`);
    }

    this.config.types = this.config.types.filter(
      t => Object.is(t, typeToRemove)
    );
  }

  getTypes() {
    if (this.config.types === undefined) {
      return [];
    }
    return this.config.types;
  }
}