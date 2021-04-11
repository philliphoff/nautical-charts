// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

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

const colorIndexMasks = [
    0b00000000, // 0-bits (placeholder)
    0b01000000, // 1-bits (2 color palette)
    0b01100000, // 2-bits (4 color palette)
    0b01110000, // 3-bits (8 color palette)
    0b01111000, // 4-bits (16 color palette)
    0b01111100, // 5-bits (32 color palette)
    0b01111110, // 6-bits (64 color palette)
    0b01111111  // 7-bits (128 color palette)
];

const runLengthMasks = [
    0b01111111,
    0b00111111,
    0b00011111,
    0b00001111,
    0b00000111,
    0b00000011,
    0b00000001,
    0b00000000
];

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
    let colorIndexMask = colorIndexMasks[bitDepth];

    const value = readVariableLengthValue(stream);
    const colorIndex = (value[0] & colorIndexMask) >>> (7 - bitDepth);

    let lengthMask = runLengthMasks[bitDepth];

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

    // HACK: BSB 3.07 seems to omit the 4-null-byte token; it's probably generally be safe to
    //       look for the 2-null-byte first half of the first index (which assumes the header
    //       is less than 65KB).
    const rasterSegmentEndToken = [0x00, 0x00 /*, 0x00, 0x00 */];

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
