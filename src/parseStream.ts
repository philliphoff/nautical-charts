import { Readable, ReadableOptions, Transform, TransformOptions } from 'stream';

export class ArrayStream extends Readable {
    private position = 0;

    constructor(private readonly contents: Uint8Array, options: ReadableOptions) {
        super(options);
    }

    _read(size: number) {
        if (this.position < this.contents.length) {
            size = Math.min(size, this.contents.length - this.position);

            const buffer = this.contents.slice(this.position, this.position + size);

            this.position += size;

            this.push(buffer);
        } else {
            this.push(null);
        }
    }
}

class StreamBuffer {
    private buffer = Buffer.alloc(0);

    indexOf(values: number[]): number {
        for (let indexOfValues = 0; indexOfValues < this.buffer.length - values.length; indexOfValues++) {
            let i = 0;

            for (; i < values.length; i++) {
                if (this.buffer[indexOfValues + i] !== values[i]) {
                    break;
                }
            }

            if (i === values.length) {
                return indexOfValues;
            }
        }

        return -1;
    }

    get length(): number {
        return this.buffer.length;
    }

    push(chunk: Buffer) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
    }

    read(length: number): Buffer {
        const readBuffer = this.buffer?.slice(0, length);

        this.buffer = this.buffer?.slice(length);

        return readBuffer;
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

    private processText(): boolean {
        const index = this.buffer.indexOf([0x0D, 0x0A]);
                    
        if (index >= 0) {
            // TODO: Exclude EOL
            const textBuffer = this.buffer.read(index + 2);
            
            this.push({ type: 'text', text: textBuffer });

            return true;
        }

        const textSegmentEndToken = [0x1A, 0x00];
        const endIndex = this.buffer.indexOf(textSegmentEndToken);

        if (endIndex >= 0) {
            this.buffer.read(textSegmentEndToken.length);

            this.processor = this.processBitDepth;

            return true;
        }

        return false;
    }

    private processBitDepth(): boolean {
        if (this.buffer.length > 0) {
            const bitDepthBuffer = this.buffer.read(1);

            this.bitDepth = bitDepthBuffer[0];

            this.processor = this.processRasterSegment;

            return true;
        }

        return false;
    }

    private processRasterSegment(): boolean {
        return false;
    }
}