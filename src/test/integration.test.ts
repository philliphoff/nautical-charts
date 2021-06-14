// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

import * as fs from 'fs';
import * as path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { parseChart } from '../index';
import { MemoryStream } from '../memoryStream';
import { parseMetadata } from '../metadata';
import { writeRasterSegment } from '../raster';

const testAssetDir = path.join(__dirname, '..', '..', 'assets', 'test');

function readPngFromPath(path: string): Promise<PNG> {   
    return new Promise(
        (resolve, reject) => {
            const stream = fs.createReadStream(path);
            const png = new PNG();

            stream
                .pipe(png)
                .on('parsed', () => resolve(png))
                .on('error', err => reject(err));
        });
}

test('integration with file stream', async () => {
    const fileStream = fs.createReadStream(path.join(testAssetDir, '344102.KAP'));

    const chart = await parseChart(fileStream);
    
    expect(chart).toBeDefined();
    expect(chart!.textSegment).toBeDefined();
    expect(chart!.rasterSegment).toBeDefined();

    const metadata = parseMetadata(chart!.textSegment!);

    expect(metadata.palette).toBeDefined();
    expect(metadata.size).toBeDefined();

    const actualImage = new PNG({
        colorType: 2, // RGB
        height: metadata.size!.height,
        width: metadata.size!.width
    });
    
    writeRasterSegment(chart!.rasterSegment!, metadata.palette!, actualImage.data, actualImage.width);

    const expectedImage = await readPngFromPath(path.join(testAssetDir, '344102.png'));

    expect(actualImage.height).toEqual(expectedImage.height);
    expect(actualImage.width).toEqual(expectedImage.width);

    const { height, width } = actualImage;
    const diffImage = new PNG({ height, width });

    const mismatchedPixels = pixelmatch(actualImage.data, expectedImage.data, diffImage.data, width, height, { threshold: 0.1 });

    expect(mismatchedPixels).toEqual(0);
});

test('integration with memory stream', async () => {
    const fileBuffer = fs.readFileSync(path.join(testAssetDir, '344102.KAP'));
    const fileStream = new MemoryStream(fileBuffer);

    const chart = await parseChart(fileStream);
    
    expect(chart).toBeDefined();
    expect(chart!.textSegment).toBeDefined();
    expect(chart!.rasterSegment).toBeDefined();

    const metadata = parseMetadata(chart!.textSegment!);

    expect(metadata.palette).toBeDefined();
    expect(metadata.size).toBeDefined();

    const actualImage = new PNG({
        colorType: 2, // RGB
        height: metadata.size!.height,
        width: metadata.size!.width
    });
    
    writeRasterSegment(chart!.rasterSegment!, metadata.palette!, actualImage.data, actualImage.width);

    const expectedImage = await readPngFromPath(path.join(testAssetDir, '344102.png'));

    expect(actualImage.height).toEqual(expectedImage.height);
    expect(actualImage.width).toEqual(expectedImage.width);

    const { height, width } = actualImage;
    const diffImage = new PNG({ height, width });

    const mismatchedPixels = pixelmatch(actualImage.data, expectedImage.data, diffImage.data, width, height, { threshold: 0.1 });

    expect(mismatchedPixels).toEqual(0);
});