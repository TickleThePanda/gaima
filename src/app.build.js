import { promises as fs } from 'fs';
import path from 'path';

import sharp from 'sharp';
import slugify from 'slugify';


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
  constructor({
    name, description
  }) {
    this.descriptor = {
      name, description,
      galleries: []
    }

    this.gallery = null;
    this.image = null;
  }

  addGallery({
    name, description
  }) {
    const gallery = {
      name, description,
      images: []
    };
    this.descriptor.galleries.push(gallery);
    this.gallery = gallery;
    this.image = null;
  }

  addImage({
    name, description, originalImageUrl
  }) {
    if (this.gallery === null) {
      throw new Error('To add an image, you must add a gallery first.')
    }
    const image = {
      name, description, originalImageUrl,
      sizes: []
    }
    this.gallery.images.push(image)
    this.image = image;
  }

  addSize({
    x, y, url
  }) {
    if (this.image === null) {
      throw new Error('To add a size, you must add an image first.');
    }
    const size = {
      x, y, url
    }

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
      description: this.configManager.description
    });

    for (let gallery of galleries) {
      const slugifiedGalleryName = slugify(gallery.name).toLowerCase();
      descriptorBuilder.addGallery({
        name: gallery.name,
        description: gallery.description
      })

      const galleryBuildDir = path.join(buildDir, slugifiedGalleryName);
      const galleryUrl = slugifiedGalleryName;

      await fs.mkdir(galleryBuildDir, {
        recursive: true
      });

      const images = this.configManager.getImages(gallery.name);

      for (let image of images) {
        console.log(`Generating "${image.name}" of "${gallery.name}"`)
        const buffer = await this.configManager.objectStore.get(image.hash);
        const imageMetadata = await sharp(buffer).metadata();
        const sluggedImageName = slugify(image.name).toLocaleLowerCase();

        const extension = imageMetadata.format;

        const fileNameOriginal = sluggedImageName + '_original.' + extension;

        const filePathOriginal = path.join(galleryBuildDir, fileNameOriginal);

        await fs.writeFile(filePathOriginal, buffer);

        const imageType = this.configManager.getType(image.type);

        descriptorBuilder.addImage({
          name: image.name,
          description: image.description,
          alt: image.alt,
          originalImageUrl: galleryUrl + '/' + fileNameOriginal
        })

        for (let size of imageType.sizes) {

          const resizedBuffer = await sharp(buffer)
            .resize(size.x, size.y)
            .toFormat('jpeg')
            .toBuffer();

          const fileNameSize = sluggedImageName + '_' + size.x + 'x' + size.y + '.' + extension;

          const filePathSize = path.join(galleryBuildDir, fileNameSize);

          descriptorBuilder.addSize({
            x: size.x, y: size.y,
            url: galleryUrl + '/' + fileNameSize
          })

          await fs.writeFile(filePathSize, resizedBuffer);
        }

      }
    }
    await fs.writeFile(path.join(buildDir, 'galleries.json'), JSON.stringify(descriptorBuilder.descriptor, null, 2));
  }
}
