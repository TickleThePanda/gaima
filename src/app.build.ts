import { promises as fs, constants as fsConstants } from "fs";
import path from "path";

import sharp from "sharp";

import { ConfigManager } from "./config-manager.js";

export type DescriptorBuilderConstructorOptions = {
  name: string;
  description: string;
};

export type GalleryDescriptorArgs = {
  name: string;
  ref: string;
  description: string;
};

export type ImageDescriptorArgs = {
  name: string;
  description: string | undefined;
  favourite: boolean;
  favouriteGallery: string | undefined;
  alt: string;
  meta: string | null | undefined;
  originalImageUrl: string;
  aspectRatio: {
    x: string;
    y: string;
  };
};

export type SizeDescriptorArgs = {
  x: number;
  y: number;
  type: string;
  url: string;
};

export type Descriptor = {
  name: string;
  description: string;
  galleries: GalleryDescriptor[]
}

export type GalleryDescriptor = {
  name: string;
  ref: string;
  description: string;
  images: ImageDescriptor[]
}

export type ImageDescriptor = {
  name: string;
  description: string | undefined;
  favourite: boolean;
  alt: string;
  meta: string | null | undefined;
  originalImageUrl: string;
  sizes: SizeDescriptor[];
  aspectRatio: {
    x: string;
    y: string;
  },
}

export type SizeDescriptor = {
  x: number,
  y: number,
  type: string;
  url: string;
};

/**
 * This is a stateful builder that will add a gallery, image,
 * or size at the respective level in the latest added parent
 * level. The "gallery" is the parent of "image" and the
 * "image" is the parent of a "size".
 *
 * For example, if you've added a gallery and an image, the
 * size will be added to that image in the gallery.
 */
class DescriptorBuilder {
  descriptor: Descriptor;
  gallery: GalleryDescriptor | undefined;
  image: ImageDescriptor | undefined;

  constructor({ name, description }: DescriptorBuilderConstructorOptions) {
    this.descriptor = {
      name,
      description,
      galleries: [],
    };

    this.gallery = undefined;
    this.image = undefined;
  }

  addGallery({ name, ref, description }: GalleryDescriptorArgs) {
    const gallery = {
      name,
      ref,
      description,
      images: [],
    };
    this.descriptor.galleries.push(gallery);
    this.gallery = gallery;
    this.image = undefined;
  }

  addImage({
    name,
    description,
    favourite,
    favouriteGallery,
    alt,
    meta,
    originalImageUrl,
    aspectRatio,
  }: ImageDescriptorArgs) {
    if (this.gallery === undefined) {
      throw new Error("To add an image, you must add a gallery first.");
    }
    const image = {
      name,
      description,
      favourite,
      favouriteGallery,
      alt,
      meta,
      originalImageUrl,
      sizes: [],
      aspectRatio,
    };
    this.gallery.images.push(image);
    this.image = image;
  }

  addSize({ x, y, type, url }: SizeDescriptorArgs) {
    if (this.image === undefined) {
      throw new Error("To add a size, you must add an image first.");
    }
    const size = {
      x,
      y,
      type,
      url,
    };

    this.image.sizes.push(size);
  }
}

export class GaimaBuildCommand {
  configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  async build() {

    const store = await this.configManager.objectStore;
    const buildDir = this.configManager.config.buildDir;

    const descriptorBuilder = new DescriptorBuilder({
      name: this.configManager.config.name,
      description: this.configManager.config.description,
    });

    let prevGallery = undefined;
    let prevImage = undefined;
    let currentImageBuffer = undefined;

    for (const inst of this.configManager.getAllImageInstances()) {
      const galleryUrl = inst.getGallerySlug();
      if (prevGallery !== inst.gallery) {
        descriptorBuilder.addGallery({
          name: inst.gallery.name,
          ref: galleryUrl,
          description: inst.gallery.description,
        });
  
        await fs.mkdir(inst.getGalleryDirPath(), {
          recursive: true,
        });

        prevGallery = inst.gallery;
      }

      if (prevImage !== inst.image) {

        const fileNameOriginal = inst.getOriginalSlugOutputName();
        const filePathOriginal = inst.getFilePathOriginal();
        const buffer = await store.get(inst.image.hash);

        if (!(await fileExists(filePathOriginal))) {
          console.log(`Writing ${filePathOriginal}`);
          await fs.writeFile(filePathOriginal, buffer);
        } else {
          console.log(`Skipping ${filePathOriginal}`);
        }

        descriptorBuilder.addImage({
          name: inst.image.name,
          description: inst.image.description,
          meta: inst.image.meta,
          alt: inst.image.alt,
          favourite: inst.image.favourite ?? false,
          favouriteGallery: inst.image.favouriteGallery,
          aspectRatio: {
            x: inst.image.type.split(":")[0],
            y: inst.image.type.split(":")[1],
          },
          originalImageUrl: galleryUrl + "/" + fileNameOriginal,
        });

        prevImage = inst.image;
        currentImageBuffer = buffer;
      }

      const fileNameSize = inst.getImageSizeName();
      const filePathSize = inst.getImageSizePath();

      descriptorBuilder.addSize({
        x: inst.size.x,
        y: inst.size.y,
        type: inst.fileType.id,
        url: galleryUrl + "/" + fileNameSize,
      });

      if (!(await fileExists(filePathSize))) {
        console.log(`Writing ${filePathSize}`);
        const resizedBuffer = await sharp(currentImageBuffer)
          .resize(inst.size.x, inst.size.y)
          .toFormat(inst.fileType)
          .toBuffer();

        await fs.writeFile(filePathSize, resizedBuffer);
      } else {
        console.log(`Skipping ${filePathSize}`);
      }
          
        
    }
    await fs.writeFile(
      path.join(buildDir, "galleries.json"),
      JSON.stringify(descriptorBuilder.descriptor, null, 2)
    );
  }
}

async function fileExists(path: string) {
  try {
    await fs.access(path, fsConstants.F_OK);
    return true;
  } catch (e) {
    return false;
  }
}
