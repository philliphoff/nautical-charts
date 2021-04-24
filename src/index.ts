// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

import { ChartStream, ChartStreamDataTypes } from './chartStream';
import { KapRasterRow, parseRasterSegmentFromLine } from './raster';
import { KapTextEntry, parseTextSegmentEntries } from './text';
export { MemoryStream } from './memoryStream';
export { KapMetadata, parseKapMetadata } from './metadata';

export { KapRasterRow, KapRasterRun, writeRasterSegment } from './raster';

export interface KapChart {
    readonly rasterSegment?: KapRasterRow[];
    readonly textSegment?: KapTextEntry[];
}

export function parseChart(stream: NodeJS.ReadableStream): Promise<KapChart | undefined> {
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
                    const rasterSegment = parseRasterSegmentFromLine(rows, bitDepth);

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
