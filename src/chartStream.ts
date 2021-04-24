import { Transform, TransformOptions } from 'stream';

class StreamBuffer {
    private buffer = Buffer.alloc(0);

    push(chunk: Buffer) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
    }

    tryReadUntil(values: Buffer): Buffer | undefined {
        const index = this.buffer.indexOf(values);
                    
        if (index >= 0) {
            return this.read(index + 2);
        }

        return undefined;
    }

    tryReadValues(values: Buffer): number {
        let index = 0;

        for (; index <= this.buffer.length && this.buffer[index] === values[index]; index++) {
        }

        if (index === values.length) {
            this.read(values.length);
        }

        return index;
    }

    tryReadLength(length: number): Buffer | undefined {
        if (this.buffer.length >= length) {
            return this.read(length);
        }

        return undefined;
    }

    tryReadVariableLengthValue(): number[] | undefined {
        const row = [];

        let current;
        let currentPosition = 0;
    
        do
        {
            if (currentPosition === this.buffer.length) {
                return undefined;
            }

            current = this.buffer[currentPosition++];
    
            row.push(current & 0x7F);
        } while (current > 127);
    
        this.read(row.length);

        return row;    
    }

    private read(length: number): Buffer {
        const oldBuffer = this.buffer;

        this.buffer = Buffer.from(oldBuffer.buffer, oldBuffer.byteOffset + length);

        return Buffer.from(oldBuffer.buffer, oldBuffer.byteOffset, length);
    }
}

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