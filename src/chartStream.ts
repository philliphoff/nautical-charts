// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

import { Transform, TransformOptions } from 'stream';
import StreamBuffer from './streamBuffer';

export type TextEntryData = {
    type: 'text';
    text: string;
};

export type BitDepthData = {
    type: 'bitDepth';
    bitDepth: number;
};

export type RasterRowData = {
    type: 'row';
    row: number[][];
};

export type ChartStreamDataTypes = TextEntryData | BitDepthData | RasterRowData;

export interface ReadableChartStream {
    on(name: 'data', handler: (data: ChartStreamDataTypes) => void): this;
}

export class ChartStream extends Transform implements ReadableChartStream {
    private readonly buffer = new StreamBuffer();
    private processor: () => boolean;

    constructor(options?: TransformOptions) {
        super(options);

        this.processor = this.processText;
    }

    _flush(callback: () => void) {
        this.processChunks();

        callback();
    }

    _transform(chunk: Buffer, encoding: unknown, callback: () => void) {
        this.buffer.push(chunk);

        this.processChunks();

        callback();
    }

    private processChunks() {
        let processed = false;

        do {
            processed = this.processor();
        } while (processed);
    }

    private readonly textEntryEndToken = Buffer.from([0x0D, 0x0A]);
    private readonly textSegmentEndToken = Buffer.from([0x1A, 0x00]);

    // HACK: BSB 3.07 seems to omit the 4-null-byte token; it's probably generally be safe to
    //       look for the 2-null-byte first half of the first index (which assumes the header
    //       is less than 65KB).
    private readonly rasterEndToken = Buffer.from([0x00]);

    private processText(): boolean {
        const matchCount = this.buffer.tryReadValues(this.textSegmentEndToken);

        if (matchCount === this.textSegmentEndToken.length) {
            this.processor = this.processBitDepth;

            return true;
        } else if (matchCount > 0) {
            return false;
        }

        const text = this.buffer.tryReadUntil(this.textEntryEndToken);

        if (text) {
            this.push({ type: 'text', text: Buffer.from(text.buffer, text.byteOffset, text.length - this.textEntryEndToken.length).toString('ascii') });

            return true;
        }

        return false;
    }

    private processBitDepth(): boolean {
        const bitDepthBuffer = this.buffer.tryReadLength(1);

        if (bitDepthBuffer) {
            const bitDepth = bitDepthBuffer[0];

            this.push({ type: 'bitDepth', bitDepth });

            this.processor = this.processRasterSegment;

            return true;
        }

        return false;
    }

    private processRasterSegment(): boolean {
        const matchCount = this.buffer.tryReadValues(this.rasterEndToken);

        if (matchCount === this.rasterEndToken.length) {
            this.end();

            return false;
        } else if (matchCount > 0) {
            return false;
        }

        this.processor = this.processRasterRow;

        return true;
    }

    private row: number[][] = [];

    private processRasterRow(): boolean {
        const matchCount = this.buffer.tryReadValues(this.rasterEndToken);

        if (matchCount === this.rasterEndToken.length) {
            this.push({ type: 'row', row: this.row });

            this.row = [];

            this.processor = this.processRasterSegment;

            return true;
        } else if (matchCount > 0) {
            return false;
        }

        const value = this.buffer.tryReadVariableLengthValue();

        if (value) {
            this.row.push(value);

            return true;
        }

        return false;
    }
}