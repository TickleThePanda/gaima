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


    if (typeof aspectRatio === 'string') {
      return this.config.types.find(t => t.name === aspectRatio);
    } else {
      return this.config.types
        .find(t => t.aspectRatio.x === aspectRatio.x
                  && t.aspectRatio.y === aspectRatio.y);
    }

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

    const newAspectRatio = {
      name: `${aspectRatio.x}:${aspectRatio.y}`,
      aspectRatio,
      sizes
    };

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

  addGallery({
    name, description
  }) {
    checkGalleriesConfigFormat(this.config.galleries);

    if (this.getGallery(name) !== undefined) {
      throw new ConfigError('Gallery ' + name + ' already exists');
    }

    if (!Array.isArray(this.config.galleries)) {
      this.config.galleries = [];
    }

    const newGallery = { name, description };

    this.config.galleries.push(newGallery);
  }

  getGallery(name) {
    checkGalleriesConfigFormat(this.config.galleries);

    if (!Array.isArray(this.config.galleries)) {
      return undefined;
    }

    return this.config.galleries.find(g => g.name === name);
  }

  getGalleries() {
    checkGalleriesConfigFormat(this.config.galleries);

    if (this.config.galleries === undefined) {
      return [];
    }
    return this.config.galleries;
  }

  removeGallery({name}) {
    checkGalleriesConfigFormat(this.config.galleries);

    if (this.config.galleries === undefined) {
      throw new ConfigError("No galleries to delete");
    }

    const galleryToRemove = this.getGallery(name);

    if (galleryToRemove === undefined) {
      throw new ConfigError(`Gallery ${name} does not exist so can't be deleted`);
    }

    this.config.galleries = this.config.galleries.filter(
      g => !Object.is(g, galleryToRemove)
    );

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

function checkGalleriesConfigFormat(galleries) {
  if (galleries === undefined) {
    return;
  } else if (!Array.isArray(galleries)) {
    throw new ConfigError(
      `Unrecognised config format. "galleries" was of type "${typeof galleries}", not "array"`
    );
  }
}
