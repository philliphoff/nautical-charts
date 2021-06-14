// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

import { BsbRasterRow, parseRasterRow } from './raster';
import StreamBuffer from './streamBuffer';
import { BsbTextEntry, parseTextSegmentEntries } from './text';
export { MemoryStream } from './memoryStream';
export { BsbMetadata, parseMetadata } from './metadata';
export { BsbRasterRow, BsbRasterRun, writeRasterSegment } from './raster';

/**
 * @module nautical-charts
 */

/**
 * A BSB chart.
 */
export interface BsbChart {
    /**
     * The rows that comprise the raster segment of the chart.
     */
    readonly rasterSegment?: BsbRasterRow[];

    /**
     * The text entries that comprise the text segment of the chart.
     */
    readonly textSegment?: BsbTextEntry[];
}

/**
 * Parses a BSB chart from a readable (e.g. file) stream.
 * @param stream The stream from which to read the chart data.
 * @returns A BSB chart.
 */
export function parseChart(stream: NodeJS.ReadableStream): Promise<BsbChart> {
    return new Promise(
        (resolve, reject) => {
            const textEntries: string[] = [];
            let bitDepth: number;
            const rows: BsbRasterRow[] = [];

            const buffer = new StreamBuffer();
            let processor: () => boolean = processText;
        
            function processChunks() {
                let processed = false;
        
                do {
                    processed = processor();
                } while (processed);
            }

            const textEntryEndToken = Buffer.from([0x0D, 0x0A]);
            const textSegmentEndToken = Buffer.from([0x1A, 0x00]);
        
            // HACK: BSB 3.07 seems to omit the 4-null-byte token; it's probably generally be safe to
            //       look for the 2-null-byte first half of the first index (which assumes the header
            //       is less than 65KB).
            const rasterEndToken = Buffer.from([0x00]);
        
            function processText(): boolean {
                const matchCount = buffer.tryReadValues(textSegmentEndToken);
        
                if (matchCount === textSegmentEndToken.length) {
                    processor = processBitDepth;
        
                    return true;
                } else if (matchCount > 0) {
                    return false;
                }
        
                const text = buffer.tryReadUntil(textEntryEndToken);
        
                if (text) {
                    textEntries.push(Buffer.from(text.buffer, text.byteOffset, text.length - textEntryEndToken.length).toString('ascii'));
        
                    return true;
                }
        
                return false;
            }
        
            function processBitDepth(): boolean {
                const bitDepthBuffer = buffer.tryReadLength(1);
        
                if (bitDepthBuffer) {
                    bitDepth = bitDepthBuffer[0];
                
                    processor = processRasterSegment;
        
                    return true;
                }
        
                return false;
            }
        
            function processRasterSegment(): boolean {
                const matchCount = buffer.tryReadValues(rasterEndToken);
        
                if (matchCount === rasterEndToken.length) {
                    // TODO: Should only remove our listeners.
                    stream.removeAllListeners();
        
                    completeParse();

                    return false;
                } else if (matchCount > 0) {
                    return false;
                }
        
                processor = processRasterRow;
        
                return true;
            }
        
            let row: number[][] = [];
        
            function processRasterRow(): boolean {
                const matchCount = buffer.tryReadValues(rasterEndToken);
        
                if (matchCount === rasterEndToken.length) {
                    rows.push(parseRasterRow(row, bitDepth));
        
                    row = [];
        
                    processor = processRasterSegment;
        
                    return true;
                } else if (matchCount > 0) {
                    return false;
                }
        
                const value = buffer.tryReadVariableLengthValue();
        
                if (value) {
                    row.push(value);
        
                    return true;
                }
        
                return false;
            }

            function completeParse() {
                const textSegment = parseTextSegmentEntries(textEntries);

                resolve({
                    rasterSegment: rows,
                    textSegment
                });
            }

            stream.on(
                'data',
                (data: Buffer) => {
                    buffer.push(data);

                    processChunks();            
                });

            stream.on(
                'end',
                () => {
                    completeParse();
                });

            stream.on(
                'error',
                err => {
                    reject(err);
                });
        });
}
