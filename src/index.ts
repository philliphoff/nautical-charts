import * as fs from 'fs-extra';
import { PNG } from 'pngjs';
import { TextDecoder } from 'util';
import { KapMetadata, parseMetadata } from './metadata';
import KapStream from './stream';
import { KapTextEntry, parseTextSegment } from './text';

const kapFileName = './samples/18400/18400_1.kap';

const decoder = new TextDecoder();

export interface KapRasterRun {
    colorIndex: number;
    length: number;
}

export interface KapRasterRow {
    readonly rowNumber: number;
    readonly runs: KapRasterRun[];
}

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

    // Skip redundant image depth.
    // TODO: Verify match to text section.
    const bitDepth = stream.next()!;

    const rows: KapRasterRow[] = [];

    const isEndOfRasterData =
        () =>
            stream.peek(0) === 0x00
            && stream.peek(1) === 0x00
            && stream.peek(2) === 0x00
            && stream.peek(3) === 0x00;

    while (stream.hasNext && !isEndOfRasterData()) {
        const rowNumber = readRowNumber(stream);

        const runs: KapRasterRun[] = [];

        while (stream.hasNext && stream.peek(0) !== 0x00) {
            const value = readRasterRun(stream, bitDepth);

            runs.push(value);
        }

        stream.next();

        rows.push({ rowNumber, runs });
    }

    return { metadata, textSegment, rasterSegment: rows };
}

function readVariableLengthValue(stream: KapStream): number[] {
    const row = [];

    let current;

    do
    {
        current = stream.next();

        if (current !== undefined) {
            row.push(current & 0x7F);
        }
    } while (current !== undefined && current > 127);

    return row;
}

function readRowNumber(stream: KapStream): number {
    const value = readVariableLengthValue(stream);

    let number = 0;

    for (let i = value.length - 1, pow = 0; i >= 0; i--, pow++) {
        number += value[i] * Math.pow(128, pow);
    }

    return number;
}

function readRasterRun(stream: KapStream, bitDepth: number): KapRasterRun {
    // 0000 1111
    // 1000 0000 = 128
    // 1100 0000
    // 1110 0000
    // 1111 0000

    // 0111 1000
    let colorIndexMask = 0;

    for (let i = 0; i < bitDepth; i++) {
        colorIndexMask += Math.pow(2, i);
    }

    colorIndexMask <<= (bitDepth - 1); 

    const value = readVariableLengthValue(stream);
    const colorIndex = (value[0] & colorIndexMask) >>> (7 - bitDepth);

    let lengthMask = 0;

    // 0000 0111

    for (let i = 0; i < 7 - bitDepth; i++) {
        lengthMask += Math.pow(2, i);
    }

    let length = 1;

    for (let i = value.length - 1, j = 0; i >= 0; i--, j++) {
        let v = value[i];
        
        if (i === 0) {
            v &= lengthMask;
        }

        length += v * Math.pow(128, j);
    }

    return { colorIndex, length };
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

    const width = 17080;
    const height = 12316;

    const png = new PNG({
        colorType: 2, // RGB
        height,
        width
    });

    kapChart?.rasterSegment?.forEach(
        row => {
            // Row numbers are 1-based.
            const y = row.rowNumber - 1;

            let x = 0;

            for (let run of row.runs) {
                // TODO: Watch for undefined?
                const rgb = kapChart!.metadata!.palette![run.colorIndex];

                for (let i = 0; i < run.length; i++, x++) {
                    const index = (y * width * 4) + (x * 4);

                    png.data[index] = rgb.r;
                    png.data[index + 1] = rgb.g;
                    png.data[index + 2] = rgb.b;
                    png.data[index + 3] = rgb.a ?? 255;
                }
            }
        });

    const pngBuffer = PNG.sync.write(png);

    await fs.writeFile('./samples/18400/18400_1.test.png', pngBuffer);
}

go();
