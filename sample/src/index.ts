import * as fs from 'fs-extra';
import { PNG } from 'pngjs';
import { ArrayStream, readChartAsync } from 'nautical-charts';
import { KapRasterRun, writeRasterSegment } from 'nautical-charts';

const kapFileName = '../samples/18400/344102.kap';

function toHexString(binary: number[]): string {
    return binary.map(
        byte => {
            const value = byte.toString(16).toUpperCase();

            if (value.length === 1) {
                return '0' + value;
            } else {
                return value;
            }
        }).join(' ');
}

function printRun(run: KapRasterRun): string {
    return `[${run.colorIndex} ${run.length}]`;
}

async function go() {
    const kapBuffer = await fs.readFile(kapFileName);

    const kapStream = new ArrayStream(kapBuffer, {});

    const kapChart = await readChartAsync(kapStream);

    console.log(kapChart?.textSegment);

    if (kapChart?.rasterSegment) {
        kapChart.rasterSegment.forEach(
            row => {
                console.log(`${row.rowNumber}: ${row.runs.map(run => printRun(run)).join(' ')}`);
            });
    }

    // TODO: Infer dimensions if no metadata exists.
    const height = kapChart!.metadata!.height!;
    const width = kapChart!.metadata!.width!;

    const png = new PNG({
        colorType: 2, // RGB
        height,
        width
    });

    if (kapChart?.rasterSegment && kapChart?.metadata?.palette) {
        writeRasterSegment(kapChart.rasterSegment, kapChart.metadata.palette, png.data, png.width);
    }

    const pngBuffer = PNG.sync.write(png);

    await fs.writeFile('../samples/18400/344102.test.png', pngBuffer);
}

go();
