import { promises as fs, constants as fsConstants } from "fs";
import path from "path";

import sharp from "sharp";
import slugify from "slugify";

import { XMLParser } from "fast-xml-parser";

const OUTPUT_TYPES = ["webp", "jpeg"];

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
  constructor({ name, description }) {
    this.descriptor = {
      name,
      description,
      galleries: [],
    };

    this.gallery = null;
    this.image = null;
  }

  addGallery({ name, ref, description }) {
    const gallery = {
      name,
      ref,
      description,
      images: [],
    };
    this.descriptor.galleries.push(gallery);
    this.gallery = gallery;
    this.image = null;
  }

  addImage({
    name,
    description,
    favourite,
    alt,
    meta,
    originalImageUrl,
    aspectRatio,
  }) {
    if (this.gallery === null) {
      throw new Error("To add an image, you must add a gallery first.");
    }
    const image = {
      name,
      description,
      favourite,
      alt,
      meta,
      originalImageUrl,
      sizes: [],
      aspectRatio,
    };
    this.gallery.images.push(image);
    this.image = image;
  }

  addSize({ x, y, type, url }) {
    if (this.image === null) {
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
  constructor(configManager) {
    this.configManager = configManager;
  }

  async build(args) {
    const buildDir = this.configManager.config.buildDir;

    const galleries = this.configManager.getGalleries();
    const descriptorBuilder = new DescriptorBuilder({
      name: this.configManager.config.name,
      description: this.configManager.description,
    });

    for (let gallery of galleries) {
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

      for (let image of images) {
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

        descriptorBuilder.addImage({
          name: image.name,
          description: image.description,
          meta: meta,
          alt: image.alt,
          favourite: image.favourite,
          aspectRatio: {
            x: image.type.split(":")[0],
            y: image.type.split(":")[1],
          },
          originalImageUrl: galleryUrl + "/" + fileNameOriginal,
        });

        for (let size of imageType.sizes) {
          for (let type of OUTPUT_TYPES) {
            const fileNameSize =
              sluggedImageName + "_" + size.x + "x" + size.y + "." + type;

            const filePathSize = path.join(galleryBuildDir, fileNameSize);

            descriptorBuilder.addSize({
              x: size.x,
              y: size.y,
              type: type,
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

function extractFilmInfo(imageMetadata) {
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
      (v) =>
        v.reduce((p, c) => {
          return Object.assign({}, p, c);
        }, {}),
      "description",
      "Alt",
      "li",
      (v) => v.replace(/\n.*/g, ""),
    ]);
  } else {
    return undefined;
  }
}

function extract(data, path) {
  let last = data;
  for (const loc of path) {
    if (last === undefined) {
      return undefined;
    }
    if (typeof loc === "function") {
      last = loc(last);
    } else {
      last = last[loc];
    }
  }
  return last;
}

async function fileExists(path) {
  try {
    await fs.access(path, fsConstants.F_OK);
    return true;
  } catch (e) {
    return false;
  }
}
