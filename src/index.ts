// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

import { ChartStream, ChartStreamDataTypes } from './chartStream';
import { BsbRasterRow, parseRasterSegment } from './raster';
import { BsbTextEntry, parseTextSegmentEntries } from './text';
export { MemoryStream } from './memoryStream';
export { KapMetadata, parseKapMetadata } from './metadata';

export { BsbRasterRow, BsbRasterRun, writeRasterSegment } from './raster';

export interface BsbChart {
    readonly rasterSegment?: BsbRasterRow[];
    readonly textSegment?: BsbTextEntry[];
}

export function parseChart(stream: NodeJS.ReadableStream): Promise<BsbChart | undefined> {
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
