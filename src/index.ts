import * as fs from 'fs-extra';
import { PNG } from 'pngjs';
import { TextDecoder } from 'util';
import { KapMetadata, parseMetadata } from './metadata';
import { KapRasterRow, KapRasterRun, parseRasterSegment, writeRasterSegment } from './raster';
import KapStream from './stream';
import { KapTextEntry, parseTextSegment } from './text';

const kapFileName = './samples/18400/18400_1.kap';

const decoder = new TextDecoder();

export interface KapChart {
    readonly metadata?: KapMetadata;
    
    readonly rasterSegment?: KapRasterRow[];

    readonly textSegment?: KapTextEntry[];
}

function readChart(contents: Uint8Array): KapChart | undefined {
    const stream = new KapStream(contents);

    const textSegmentEndToken = [0x1A, 0x00];
    const textSegmentBuffer = stream.readUntil(textSegmentEndToken, { consumeValues: true });

    let textSegment: KapTextEntry[] | undefined;

    if (textSegmentBuffer) {
        const textSection = decoder.decode(textSegmentBuffer);
        
        textSegment = parseTextSegment(textSection);
    }

    let metadata: KapMetadata | undefined;

    if (textSegment) {
        metadata = parseMetadata(textSegment);
    }

    let rasterSegment: KapRasterRow[] | undefined;
    
    // TODO: Verify match to text section.
    const bitDepth = stream.next();

    if (bitDepth !== undefined) {
        rasterSegment = parseRasterSegment(stream, bitDepth);
    }

    return { metadata, textSegment, rasterSegment };
}

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

    const kapChart = readChart(kapBuffer);

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

    await fs.writeFile('./samples/18400/18400_1.test.png', pngBuffer);
}

go();
