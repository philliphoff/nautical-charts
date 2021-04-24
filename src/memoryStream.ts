// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

import { Readable, ReadableOptions } from 'stream';
import { debug } from 'debug';

export class MemoryStream extends Readable {
    private static readonly log = debug('nautical-charts:memory-stream');

    private position = 0;

    constructor(private readonly contents: Uint8Array, options: ReadableOptions) {
        super(options);
    }

    _read(size: number) {
        if (this.position < this.contents.length) {
            size = Math.min(size, this.contents.length - this.position);

            MemoryStream.log(`Reading [${this.position}..${this.position + size}) (${size} bytes).`);

            // Create a Buffer that exposes a range of (i.e. does not copy) the original array...
            const buffer = Buffer.from(this.contents.buffer, this.position, size);

            this.position += size;

            this.push(buffer);
        } else {
            this.push(null);
        }
    }
}
