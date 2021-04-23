import { Readable, ReadableOptions, Transform, TransformOptions } from 'stream';

export class ArrayStream extends Readable {
    private position = 0;

    constructor(private readonly contents: Uint8Array, options: ReadableOptions) {
        super(options);
    }

    _read(size: number) {
        if (this.position < this.contents.length) {
            size = Math.min(size, this.contents.length - this.position);

            // Create a Buffer that exposes a range of (i.e. does not copy) the original array...
            const buffer = Buffer.from(this.contents.buffer, this.position, size);

            this.position += size;

            this.push(buffer);
        } else {
            this.push(null);
        }
    }
}

class StreamBuffer {
    private buffer = Buffer.alloc(0);

    indexOf(values: Buffer): number {
        return this.buffer.indexOf(values);
    }

    get inner(): Buffer {
        return this.buffer;
    }

    get length(): number {
        return this.buffer.length;
    }

    push(chunk: Buffer) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
    }

    read(length: number): Buffer {
        const oldBuffer = this.buffer;

        this.buffer = Buffer.from(oldBuffer.buffer, oldBuffer.byteOffset + length);

        return Buffer.from(oldBuffer.buffer, oldBuffer.byteOffset, length);
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
            if (currentPosition === this.buffer.length || this.buffer[currentPosition] === 0x00) {
                return undefined;
            }

            current = this.buffer[currentPosition++];
    
            row.push(current & 0x7F);
        } while (current > 127);
    
        this.read(row.length);

        return row;    
    }
}

export class ParseStream extends Transform {
    private readonly buffer = new StreamBuffer();
    private processor: () => boolean;
    private bitDepth: number | undefined;

    constructor(options: TransformOptions) {
        super(options);

        this.processor = this.processText;
    }

    _flush() {
        this.processChunks();
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
    private readonly rasterEndToken = Buffer.from([0x00]);

    private processText(): boolean {
        const matchCount = this.buffer.tryReadValues(this.textSegmentEndToken);

        if (matchCount === this.textSegmentEndToken.length) {
            this.processor = this.processBitDepth;

            return true;
        } else if (matchCount > 0) {
            return false;
        }

        const entry = this.buffer.tryReadUntil(this.textEntryEndToken);

        if (entry) {
            this.push({ type: 'text', text: entry });

            return true;
        }

        return false;
    }

    private processBitDepth(): boolean {
        const bitDepthBuffer = this.buffer.tryReadLength(1);

        if (bitDepthBuffer) {
            this.bitDepth = bitDepthBuffer[0];

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