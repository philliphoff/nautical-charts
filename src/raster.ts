import { KapPalette } from "./metadata";
import KapStream from "./stream";

export interface KapRasterRun {
    colorIndex: number;
    length: number;
}

export interface KapRasterRow {
    readonly rowNumber: number;
    readonly runs: KapRasterRun[];
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

    // 4: 0111 1000
    // 5: 0111 1100

    // 0111 1000
    let colorIndexMask = 0;

    // 7654 3210
    // 0111 1100

    for (let i = 6; i >= 7 - bitDepth; i--) {
        colorIndexMask += Math.pow(2, i);
    }

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

export function parseRasterSegment(stream: KapStream, bitDepth: number): KapRasterRow[] {
    const rows: KapRasterRow[] = [];

    const rasterSegmentEndToken = [0x00, 0x00, 0x00, 0x00];

    while (stream.hasNext && !stream.isNext(rasterSegmentEndToken)) {
        const rowNumber = readRowNumber(stream);

        const runs: KapRasterRun[] = [];

        while (stream.hasNext && stream.peek(0) !== 0x00) {
            const value = readRasterRun(stream, bitDepth);

            runs.push(value);
        }

        stream.next();

        rows.push({ rowNumber, runs });
    } 

    return rows;
}

export function writeRasterSegment(rasterSegment: KapRasterRow[], palette: KapPalette, buffer: Buffer, bufferWidth: number): void {
    for (let row of rasterSegment) {
        let x = 0;
        
        // Row numbers are 1-based.
        const y = row.rowNumber - 1;

        for (let run of row.runs) {
            const rgba = palette[run.colorIndex] ?? { r: 0x00, g: 0x00, b: 0x00, a: 0x00};

            for (let i = 0; i < run.length && x < bufferWidth; i++, x++) {
                const index = (y * bufferWidth * 4) + (x * 4);

                buffer[index] = rgba.r;
                buffer[index + 1] = rgba.g;
                buffer[index + 2] = rgba.b;
                buffer[index + 3] = rgba.a ?? 0xFF;
            }
        }
    };
}
