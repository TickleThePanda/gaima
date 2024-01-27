import { ObjectStore } from "./object-store.js";

export class ConfigError extends Error {
  constructor(message) {
    super(message);
  }
}

export class ConfigManager {
  config: any;
  objectStore: ObjectStore;

  constructor(config, objectStore) {
    this.config = config;
    this.objectStore = objectStore;
  }

  getType(aspectRatio) {
    checkTypeConfigFormat(this.config.types);

    if (this.config.types === undefined) {
      return undefined;
    }

    if (typeof aspectRatio === "string") {
      return this.config.types.find((t) => t.name === aspectRatio);
    } else {
      return this.config.types.find(
        (t) =>
          t.aspectRatio.x === aspectRatio.x && t.aspectRatio.y === aspectRatio.y
      );
    }
  }

  addType(aspectRatio, sizes) {
    checkTypeConfigFormat(this.config.types);

    if (this.getType(aspectRatio) !== undefined) {
      throw new ConfigError(
        `Type "${aspectRatio.x + ":" + aspectRatio.y}" already exists`
      );
    }

    this.setType(aspectRatio, sizes);
  }

  setType(aspectRatio, sizes) {
    checkTypeConfigFormat(this.config.types);

    const newAspectRatio = {
      name: `${aspectRatio.x}:${aspectRatio.y}`,
      aspectRatio,
      sizes,
    };

    const existingAspectRatio = this.getType(aspectRatio);

    if (this.config.types === undefined) {
      this.config.types = [];
    }

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

    this.config.types = this.config.types.filter((t) =>
      Object.is(t, typeToRemove)
    );
  }

  getTypes() {
    checkTypeConfigFormat(this.config.types);
    if (this.config.types === undefined) {
      return [];
    }
    return this.config.types;
  }

  addGallery({ name, description }) {
    checkGalleriesConfigFormat(this.config.galleries);

    if (this.getGallery(name) !== undefined) {
      throw new ConfigError("Gallery " + name + " already exists");
    }

    if (!Array.isArray(this.config.galleries)) {
      this.config.galleries = [];
    }

    const newGallery = { name, description };

    this.config.galleries.push(newGallery);
  }

  setGallery(name, { description }) {
    checkGalleriesConfigFormat(this.config.galleries);

    const gallery = this.getGallery(name);

    if (!gallery) {
      this.addGallery({ name, description });
    } else {
      gallery.description = description;
    }
  }

  getGallery(name) {
    checkGalleriesConfigFormat(this.config.galleries);

    if (!Array.isArray(this.config.galleries)) {
      return undefined;
    }

    return this.config.galleries.find((g) => g.name === name);
  }

  getGalleries() {
    checkGalleriesConfigFormat(this.config.galleries);

    if (this.config.galleries === undefined) {
      return [];
    }
    return this.config.galleries;
  }

  removeGallery({ name }) {
    checkGalleriesConfigFormat(this.config.galleries);

    if (this.config.galleries === undefined) {
      throw new ConfigError("No galleries to delete");
    }

    const galleryToRemove = this.getGallery(name);

    if (galleryToRemove === undefined) {
      throw new ConfigError(
        `Gallery ${name} does not exist so can't be deleted`
      );
    }

    this.config.galleries = this.config.galleries.filter(
      (g) => !Object.is(g, galleryToRemove)
    );
  }

  async addImage(
    galleryName,
    { name, type, buffer, description, alt, overwrite }
  ) {
    const hash = await this.objectStore.store(buffer);

    const gallery = this.getGallery(galleryName);

    const existingImage = this.getImage(galleryName, { hash });

    const hasExistingImage = existingImage !== undefined;

    if (hasExistingImage && !overwrite) {
      throw new ConfigError(
        `There is already an image with the hash ${hash} in the gallery ${galleryName}.`
      );
    }

    if (gallery.images === undefined) {
      gallery.images = [];
    }

    if (hasExistingImage) {
      existingImage.name = name;
      existingImage.hash = hash;
      existingImage.description = description;
      existingImage.type = type;
      existingImage.alt = alt;
    } else {
      gallery.images.push({
        name,
        hash,
        description,
        type,
        alt,
      });
    }
  }

  getImage(galleryName, { name, hash }: { name?: string, hash?: string }) {
    const gallery = this.getGallery(galleryName);

    const galleryImages = gallery.images;

    if (!Array.isArray(galleryImages)) {
      return undefined;
    }

    if (name !== undefined) {
      return galleryImages.find((i) => i.name === name);
    } else if (hash !== undefined) {
      return galleryImages.find((i) => i.hash === hash);
    } else {
      throw new Error("Must either define a name or a hash to find an image.");
    }
  }

  getImages(galleryName) {
    const gallery = this.getGallery(galleryName);

    if (gallery === undefined) {
      throw new ConfigError(`No gallery with name ${galleryName}`);
    }

    if (gallery.images === undefined) {
      return [];
    }
    if (!Array.isArray(gallery.images)) {
      throw new ConfigError(
        `Unrecognised config format. "gallery.images" was of type "${typeof gallery.images}", not "array"`
      );
    }
    return gallery.images;
  }

  removeImage(galleryName, { name }) {
    const gallery = this.getGallery(galleryName);

    if (gallery === undefined) {
      throw new ConfigError(`No gallery with name ${galleryName}`);
    }

    const image = this.getImage(galleryName, {
      name: name,
    });

    if (image === undefined) {
      throw new ConfigError(`No image with name ${name} in ${galleryName}`);
    }

    gallery.images = gallery.images.filter((i) => !Object.is(i, image));
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
