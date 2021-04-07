import { TextDecoder } from 'util';
import { KapMetadata, parseMetadata } from './metadata';
import { KapRasterRow, parseRasterSegment } from './raster';
import KapStream from './stream';
import { KapTextEntry, parseTextSegment } from './text';

const decoder = new TextDecoder();

export interface KapChart {
    readonly metadata?: KapMetadata;
    
    readonly rasterSegment?: KapRasterRow[];

    readonly textSegment?: KapTextEntry[];
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
