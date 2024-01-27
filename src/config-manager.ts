import path from "path";
import { ObjectStore } from "./object-store.js";
import slugify from "@sindresorhus/slugify";
import sharp from "sharp";
import { XMLParser } from "fast-xml-parser";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export type AspectRatio = {
  x: number;
  y: number;
};

export type AspectRatioDimension = {
  x: number;
  y: number;
};

export type AddGalleryArgs = {
  name: string;
  description: string;
};

export type SetGalleryArgs = {
  description: string;
};

export type AddImageArgs = {
  name: string;
  type: string;
  buffer: Buffer;
  description: string;
  favourite: boolean;
  alt: string;
  overwrite: boolean;
  favouriteGallery: string | undefined
};

export type UpdateImageArgs = {
  name: string | undefined;
  type: string | undefined;
  description: string | undefined;
  favourite: boolean | undefined;
  alt: string | undefined;
  favouriteGallery: string | undefined
};


export type RemoveImageArgs = {
  name: string;
};

export type GaimaImageConfig = {
  name: string;
  hash: string;
  originalFileExtension?: string | undefined;
  meta?: string | null | undefined;
  type: string;
  alt: string;
  description?: string | undefined;
  favourite?: boolean | undefined;
  favouriteGallery?: string | undefined
};

export type GaimaGalleryConfig = {
  name: string;
  description: string;
  images?: GaimaImageConfig[];
};

export type GaimaConfig = {
  buildDir: string;
  name: string;
  description: string;
  types: GaimaAspectRatioTypeConfig[];
  galleries: GaimaGalleryConfig[];
};

export type GaimaAspectRatioTypeConfig = {
  name: string;
  aspectRatio: {
    x: number;
    y: number;
  };
  sizes: AspectRatioDimension[];
};
export class ConfigManager {
  config: GaimaConfig;
  objectStore: ObjectStore;

  constructor(config: GaimaConfig, objectStore: ObjectStore) {
    this.config = config;
    this.objectStore = objectStore;
  }

  getType(
    aspectRatio: AspectRatio | string
  ): GaimaAspectRatioTypeConfig | undefined {
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

  addType(aspectRatio: AspectRatio, sizes: AspectRatioDimension[]) {
    checkTypeConfigFormat(this.config.types);

    if (this.getType(aspectRatio) !== undefined) {
      throw new ConfigError(
        `Type "${aspectRatio.x + ":" + aspectRatio.y}" already exists`
      );
    }

    this.setType(aspectRatio, sizes);
  }

  setType(aspectRatio: AspectRatio, sizes: AspectRatioDimension[]) {
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

  removeType(aspectRatio: AspectRatio | string) {
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

  getTypes(): GaimaAspectRatioTypeConfig[] {
    checkTypeConfigFormat(this.config.types);
    if (this.config.types === undefined) {
      return [];
    }
    return this.config.types;
  }

  addGallery({ name, description }: AddGalleryArgs) {
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

  setGallery(name: string, { description }: SetGalleryArgs) {
    checkGalleriesConfigFormat(this.config.galleries);

    const gallery = this.getGallery(name);

    if (!gallery) {
      this.addGallery({ name, description });
    } else {
      gallery.description = description;
    }
  }

  getGallery(name: string): GaimaGalleryConfig | undefined {
    checkGalleriesConfigFormat(this.config.galleries);

    if (!Array.isArray(this.config.galleries)) {
      return undefined;
    }

    return this.config.galleries.find((g) => g.name === name);
  }

  getGalleries(): GaimaGalleryConfig[] {
    checkGalleriesConfigFormat(this.config.galleries);

    if (this.config.galleries === undefined) {
      return [];
    }
    return this.config.galleries;
  }

  removeGallery(name: string) {
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
    galleryName: string,
    { name, type, buffer, description, favourite, alt, overwrite, favouriteGallery }: AddImageArgs
  ) {
    const hash = await this.objectStore.store(buffer);

    const gallery = this.getGallery(galleryName);

    if (gallery === undefined) {
      throw new ConfigError(
        `Can't add image ${name} to non-existent gallery: ${gallery}`
      );
    }

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
      existingImage.favourite = favourite;
      existingImage.favouriteGallery = favouriteGallery;
    } else {
      gallery.images.push({
        name,
        hash,
        description,
        type,
        favourite,
        alt,
        favouriteGallery
      });
    }
  }

  async updateImage(
    galleryName: string,
    imageName: string,
    { name, type, description, favourite, alt, favouriteGallery }: UpdateImageArgs
  ) {
    const existingImage = this.getImage(galleryName, { name: imageName });

    if (existingImage === undefined) {
      throw new ConfigError(`There is no image with the name ${imageName} in ${galleryName}`);
    }

    existingImage.name = name ?? existingImage.name;
    existingImage.type = type ?? existingImage.type;
    existingImage.description = description ?? existingImage.description;
    existingImage.favourite = favourite ??  existingImage.favourite;
    existingImage.alt = alt ?? existingImage.alt;
    existingImage.favouriteGallery = favouriteGallery ?? existingImage.favouriteGallery;

  }

  getImage(
    galleryName: string,
    { name, hash }: { name?: string; hash?: string }
  ) {
    const gallery = this.getGallery(galleryName);

    const galleryImages = gallery?.images;

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

  getImages(galleryName: string): GaimaImageConfig[] {
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

  removeImage(galleryName: string, { name }: RemoveImageArgs) {
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

    gallery.images = gallery.images?.filter((i) => !Object.is(i, image));
  }

  getAllImageInstances(): ImageInstance[] {

    const imageInstances = [];

    const outputTypes = [sharp.format.webp, sharp.format.jpeg];
    const galleries = this.getGalleries();
    for (const gallery of galleries) {

      const images = this.getImages(gallery.name);
      for (const image of images) {

        const imageType = this.getType(image.type);
        if (imageType === undefined) {
          throw new Error(
            `Can't generate gallery as image type ${image.type} is not defined`
          );
        }

        for (const size of imageType.sizes) {
          for (const type of outputTypes) {
            imageInstances.push(
              new ImageInstance(
                this.config.buildDir, gallery, image, size, type
              )
            );
          }
        }
      }
    }
    return imageInstances;
  }

  async upgrade(): Promise<UpgradeResult> {
    const images = this.getGalleries().flatMap(g => this.getImages(g.name));

    const noFileExtension = images.filter(i => i.originalFileExtension === undefined);

    for (const image of noFileExtension) {
      const buffer = await this.objectStore.get(image.hash);
      const metadata = await sharp(buffer).metadata();

      const format = metadata.format;

      image.originalFileExtension = format;
      
    }

    const noFilmInfo = images.filter(i => i.meta === undefined);

    for (const image of noFilmInfo) {
      const buffer = await this.objectStore.get(image.hash);
      const metadata = await sharp(buffer).metadata();
      const filmInfo = extractFilmInfo(metadata);
      image.meta = filmInfo === undefined ? null : filmInfo;
    }

    return noFileExtension.length > 0 ? UpgradeResult.CHANGES : UpgradeResult.NO_CHANGES;
  }

}

export enum UpgradeResult {
  NO_CHANGES,
  CHANGES
}

export class ImageInstance {
  buildDir: string;
  gallery: GaimaGalleryConfig;
  image: GaimaImageConfig;
  size: AspectRatioDimension;
  fileType: sharp.AvailableFormatInfo;

  constructor(
    buildDir: string,
    gallery: GaimaGalleryConfig,
    image: GaimaImageConfig,
    size: AspectRatioDimension,
    fileType: sharp.AvailableFormatInfo,
  ) {
    this.buildDir = buildDir;
    this.gallery = gallery;
    this.image = image;
    this.size = size;
    this.fileType = fileType;
  }

  getGalleryDirPath(): string {
    return path.join(this.buildDir, this.getGallerySlug());
  }

  getGallerySlug(): string {
    return slugify(this.gallery.name).toLowerCase();
  }

  getImageSizeName(): string {
    return this.getImageSlug() + "_" + this.size.x + "x" + this.size.y + "." + this.fileType.id;
  }

  getImageSizePath(): string {
    return path.join(this.getGalleryDirPath(), this.getImageSizeName());
  }

  getImageSlug(): string {
    return slugify(this.image.name).toLocaleLowerCase();
  }
  
  getOriginalSlugOutputName(): string {
    return this.getImageSlug() + "_original" + this.image.originalFileExtension;
  }

  getFilePathOriginal(): string {
    return path.join(this.getGalleryDirPath(), this.getImageSlug() + "_original." + this.image.originalFileExtension);
  }

}

function checkTypeConfigFormat(types: unknown) {
  if (types === undefined) {
    return;
  } else if (!Array.isArray(types)) {
    throw new ConfigError(
      `Unrecognised config format. "types" was of type "${typeof types}", not "array"`
    );
  }
}

function checkGalleriesConfigFormat(galleries: unknown) {
  if (galleries === undefined) {
    return;
  } else if (!Array.isArray(galleries)) {
    throw new ConfigError(
      `Unrecognised config format. "galleries" was of type "${typeof galleries}", not "array"`
    );
  }
}

function extractFilmInfo(imageMetadata: sharp.Metadata): string | undefined {
  const parser = new XMLParser({
    removeNSPrefix: true,
  });
  if (imageMetadata.xmp !== undefined) {
    const metadataBuffer = imageMetadata.xmp;
    const metadataXml = metadataBuffer.toString("ascii");
    const parsedXmp = parser.parse(metadataXml);
    return extract(parsedXmp, [
      "xmpmeta",
      "RDF",
      "Description",
      (v: unknown) =>
        Array.isArray(v) ?
          v.reduce((p, c) => Object.assign(p, c), {}) : {},
      "description",
      "Alt",
      "li",
      (v: unknown) => 
        typeof v === "string" ? v.replace(/\n.*/g, "") : undefined
    ]);
  } else {
    return undefined;
  }
}

type ExtractorFunction = (v: unknown) => object | string

function extract(data: object | undefined, path: (string | ExtractorFunction)[]): string | undefined {
  let last: unknown = data;
  for (const loc of path) {
    if (last === undefined) {
      return undefined;
    }
    if (typeof loc === "function") {
      last = loc(last);
    } else if (typeof loc === "string" && typeof last === "object") {
      last = (last as Record<string, unknown>)[loc];
    } else {
      return undefined;
    }
  }
  if (typeof last === "string") {
    return last;
  } else {
    return undefined;
  }
  
}