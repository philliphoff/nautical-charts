// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

import { KapPalette } from "./metadata";

export interface BsbRasterRun {
    colorIndex: number;
    length: number;
}

export interface BsbRasterRow {
    readonly rowNumber: number;
    readonly runs: BsbRasterRun[];
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

function readRowNumber(value: number[]): number {
    let number = 0;

    for (let i = value.length - 1, pow = 0; i >= 0; i--, pow++) {
        number += value[i] * Math.pow(128, pow);
    }

    return number;
}

function readRasterRun(value: number[], bitDepth: number): BsbRasterRun {
    let colorIndexMask = colorIndexMasks[bitDepth];

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

export function parseRasterSegment(rows: number[][][], bitDepth: number): BsbRasterRow[] {
    // TODO: Eliminate need for slice().
    return rows.map(values => ({ rowNumber: readRowNumber(values[0]), runs: values.slice(1).map(value => readRasterRun(value, bitDepth)) }));
}

export function writeRasterSegment(rasterSegment: BsbRasterRow[], palette: KapPalette, buffer: Buffer, bufferWidth: number): void {
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
