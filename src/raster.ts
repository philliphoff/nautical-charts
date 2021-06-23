// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

import { BsbPalette } from "./metadata";

/**
 * A sequential series of pixels of the same color in a row of raster data.
 */
export interface BsbRasterRun {
    /**
     * The index into a color palette that indicates the color of the pixels.
     */
    readonly colorIndex: number;

    /** The number of pixels in the run. */
    readonly length: number;
}

/**
 * A single row of raster data within the chart.
 */
export interface BsbRasterRow {

    /**
     * The (1-based) number of the row.
     */
    readonly rowNumber: number;

    /**
     * The runs that encode the raster data of the row.
     */
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

export function parseRasterRow(row: number[][], bitDepth: number): BsbRasterRow {
    const runs = Array<BsbRasterRun>(row.length - 1);

    for (let i = 0; i < runs.length; i++) {
        runs[i] = readRasterRun(row[i + 1], bitDepth);
    }

    return {
        rowNumber: readRowNumber(row[0]),
        runs
    };
}

/**
 * Writes the RLE encoded raster data of a BSB chart to a bitmap.
 * @param rasterSegment The rows of raster data for the chart.
 * @param palette The palette from which to obtain pixel values.
 * @param buffer The bitmap buffer in which to write the chart raster data.
 * @param bufferWidth The width of the bitmap buffer.
 */
export function writeRasterSegment(rasterSegment: { [index: number]: BsbRasterRow }, palette: BsbPalette, buffer: Buffer, bufferWidth: number): void {
    for (let row of Object.values(rasterSegment)) {
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
