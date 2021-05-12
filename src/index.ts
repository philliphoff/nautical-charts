// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

import { ChartStream, ChartStreamDataTypes } from './chartStream';
import { BsbRasterRow, parseRasterSegment } from './raster';
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
            const rows: number[][][] = [];

            const chartStream = new ChartStream({ objectMode: true });

            stream.pipe(chartStream);

            chartStream.on(
                'data',
                (data: ChartStreamDataTypes) => {
                    switch (data.type) {
                        case 'text':

                            textEntries.push(data.text);

                            break;

                        case 'bitDepth':

                            bitDepth = data.bitDepth;

                            break;

                        case 'row':

                            rows.push(data.row);

                            break;
                    }
                });

            chartStream.on(
                'end',
                () => {
                    const textSegment = parseTextSegmentEntries(textEntries);
                    const rasterSegment = parseRasterSegment(rows, bitDepth);

                    resolve({
                        rasterSegment,
                        textSegment
                    });
                });

            chartStream.on(
                'error',
                err => {
                    reject(err);
                });
        });
}
