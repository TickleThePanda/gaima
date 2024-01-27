import { promises as fs, constants as fsConstants } from "fs";
import path from "path";

import sharp from "sharp";
import slugify from "@sindresorhus/slugify";

import { XMLParser } from "fast-xml-parser";
import { ConfigManager } from "./config-manager.js";

const OUTPUT_TYPES = [sharp.format.webp, sharp.format.jpeg];

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
  meta: string | undefined;
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
  meta: string | undefined;
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
    const buildDir = this.configManager.config.buildDir;

    const galleries = this.configManager.getGalleries();
    const descriptorBuilder = new DescriptorBuilder({
      name: this.configManager.config.name,
      description: this.configManager.config.description,
    });

    for (const gallery of galleries) {
      const slugifiedGalleryName = slugify(gallery.name).toLowerCase();
      descriptorBuilder.addGallery({
        name: gallery.name,
        ref: slugifiedGalleryName,
        description: gallery.description,
      });

      const galleryBuildDir = path.join(buildDir, slugifiedGalleryName);
      const galleryUrl = slugifiedGalleryName;

      await fs.mkdir(galleryBuildDir, {
        recursive: true,
      });

      const images = this.configManager.getImages(gallery.name);

      for (const image of images) {
        console.log(`Generating "${image.name}" of "${gallery.name}"`);
        const buffer = await this.configManager.objectStore.get(image.hash);
        const imageMetadata = await sharp(buffer).metadata();

        const meta = extractFilmInfo(imageMetadata);
        const sluggedImageName = slugify(image.name).toLocaleLowerCase();

        const extension = imageMetadata.format;

        const fileNameOriginal = sluggedImageName + "_original." + extension;

        const filePathOriginal = path.join(galleryBuildDir, fileNameOriginal);

        if (!(await fileExists(filePathOriginal))) {
          console.log(`Writing ${filePathOriginal}`);
          await fs.writeFile(filePathOriginal, buffer);
        } else {
          console.log(`Skipping ${filePathOriginal}`);
        }

        const imageType = this.configManager.getType(image.type);

        if (imageType === undefined) {
          throw new Error(
            `Can't generate gallery as image type ${image.type} is not defined`
          );
        }

        descriptorBuilder.addImage({
          name: image.name,
          description: image.description,
          meta: meta,
          alt: image.alt,
          favourite: image.favourite ?? false,
          favouriteGallery: image.favouriteGallery,
          aspectRatio: {
            x: image.type.split(":")[0],
            y: image.type.split(":")[1],
          },
          originalImageUrl: galleryUrl + "/" + fileNameOriginal,
        });

        for (const size of imageType.sizes) {
          for (const type of OUTPUT_TYPES) {
            const fileNameSize =
              sluggedImageName + "_" + size.x + "x" + size.y + "." + type.id;

            const filePathSize = path.join(galleryBuildDir, fileNameSize);

            descriptorBuilder.addSize({
              x: size.x,
              y: size.y,
              type: type.id,
              url: galleryUrl + "/" + fileNameSize,
            });

            if (!(await fileExists(filePathSize))) {
              console.log(`Writing ${filePathSize}`);
              const resizedBuffer = await sharp(buffer)
                .resize(size.x, size.y)
                .toFormat(type)
                .toBuffer();

              await fs.writeFile(filePathSize, resizedBuffer);
            } else {
              console.log(`Skipping ${filePathSize}`);
            }
          }
        }
      }
    }
    await fs.writeFile(
      path.join(buildDir, "galleries.json"),
      JSON.stringify(descriptorBuilder.descriptor, null, 2)
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
          v.reduce((p, c) => {
            return Object.assign({}, p, c);
          }, {}) : {},
      "description",
      "Alt",
      "li",
      (v: unknown) => typeof v === "string" ? v.replace(/\n.*/g, "") : undefined,
    ]);
  } else {
    return undefined;
  }
}

type ExtractorFunction = (v: object | [] | string) => object | string

function extract(data: object | undefined, path: (string | ExtractorFunction)[]): string | undefined {
  let last: object | string | undefined = data;
  for (const loc of path) {
    if (last === undefined) {
      return undefined;
    }
    if (typeof loc === "function") {
      last = loc(last);
    } if (typeof loc === "object") {
      last = (last as object)[loc];
    }
  }
  if (typeof last === "object") {
    return undefined;
  }
  return last;
}

async function fileExists(path: string) {
  try {
    await fs.access(path, fsConstants.F_OK);
    return true;
  } catch (e) {
    return false;
  }
}
