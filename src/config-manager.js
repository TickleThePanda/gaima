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
    checkTypeConfigFormat(this.config.types);

    if (this.config.types === undefined) {
      return undefined;
    }

    return this.config.types
      .find(t => t.aspectRatio.x === aspectRatio.x
                && t.aspectRatio.y === aspectRatio.y);
  }

  addType(aspectRatio, sizes) {
    checkTypeConfigFormat(this.config.types);

    if (this.getType(aspectRatio) !== undefined) {
      throw new ConfigError(`Type "${arName}" already exists`);
    }

    this.setType(aspectRatio, sizes);
  }

  setType(aspectRatio, sizes) {
    checkTypeConfigFormat(this.config.types);

    const newAspectRatio = { aspectRatio, sizes };

    const existingAspectRatio = this.getType(aspectRatio);

    if (existingAspectRatio === undefined) {
      this.config.types.push(newAspectRatio);
    } else {
      Object.assign(existingAspectRatio, newAspectRatio);
    }
  }

  removeType(aspectRatio) {
    checkTypeConfigFormat(this.config.types);

    if (this.config.types === undefined) {
      throw new ConfigError("No types to delete");
    }

    const typeToRemove = this.getType(aspectRatio);

    if (typeToRemove === undefined) {
      throw new ConfigError(`Type "${aspectRatio}" could not be found`);
    }

    this.config.types = this.config.types.filter(
      t => Object.is(t, typeToRemove)
    );
  }

  getTypes() {
    checkTypeConfigFormat(this.config.types);

    if (this.config.types === undefined) {
      return [];
    }
    return this.config.types;
  }
}

function checkTypeConfigFormat(types) {
  if (types === undefined) {
    return;
  } else if (!Array.isArray(types)) {
    throw new ConfigError(
      `Unrecognised config format. "types" was of type "${typeof types}", not "array"`
    );
  }
}
