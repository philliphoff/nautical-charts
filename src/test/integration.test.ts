import * as fs from 'fs';
import * as path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { parseChart } from '../index';
import { parseKapMetadata } from '../metadata';
import { writeRasterSegment } from '../raster';

const testAssetDir = path.join(__dirname, '..', '..', 'assets', 'test');

test('integration', async () => {
    const file = await fs.promises.open(path.join(testAssetDir, '344102.KAP'), 'r');
    const fileStream = fs.createReadStream('', { fd: file.fd });

    const chart = await parseChart(fileStream);
    
    await file.close();

    expect(chart).toBeDefined();
    expect(chart!.textSegment).toBeDefined();
    expect(chart!.rasterSegment).toBeDefined();

    const metadata = parseKapMetadata(chart!.textSegment!);

    expect(metadata.palette).toBeDefined();
    expect(metadata.size).toBeDefined();

    const img1 = new PNG({
        colorType: 2, // RGB
        height: metadata.size!.height,
        width: metadata.size!.width
    });
    
    writeRasterSegment(chart!.rasterSegment!, metadata.palette!, img1.data, img1.width);

    const img2 = PNG.sync.read(fs.readFileSync(path.join(testAssetDir, '344102.png')));
    const {width, height} = img1;
    const diff = new PNG({width, height});

    const mismatchedPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });

    expect(mismatchedPixels).toEqual(0);
});