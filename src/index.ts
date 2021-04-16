// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

import { TextDecoder } from 'util';
import { KapMetadata, parseMetadata } from './metadata';
import { KapRasterRow, parseRasterSegment } from './raster';
import KapStream from './stream';
import { KapTextEntry, parseTextSegment } from './text';
export { ArrayStream, ParseStream } from './parseStream';

export { KapRasterRow, KapRasterRun, writeRasterSegment } from './raster';

const decoder = new TextDecoder();

interface ChartBase {
    readonly textSegment?: KapTextEntry[];
}

export interface KapChart extends ChartBase {
    readonly metadata?: KapMetadata;
    
    readonly rasterSegment?: KapRasterRow[];
}

export interface BsbChart extends ChartBase {
}

export function readChart(contents: Uint8Array): KapChart | undefined {
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

    let rasterSegment: KapRasterRow[] | undefined;
    
    // TODO: Verify match to text section.
    const bitDepth = stream.next();

    if (bitDepth !== undefined) {
        rasterSegment = parseRasterSegment(stream, bitDepth);
    }

    return { metadata, textSegment, rasterSegment };
}

export function readBsbChart(contents: Uint8Array): BsbChart | undefined {
    // TODO: Consolidate parsers.
    let textSegment: KapTextEntry[] | undefined;

    const textSection = decoder.decode(contents);
        
    textSegment = parseTextSegment(textSection);

    /*
    let metadata: KapMetadata | undefined;

    if (textSegment) {
        metadata = parseMetadata(textSegment);
    }
    */

    return { textSegment };
}
