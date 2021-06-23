// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

import { Readable, ReadableOptions } from 'stream';

/**
 * A readable stream for an in-memory byte array.
 */
export class MemoryStream extends Readable {
    private position = 0;

    /**
     * The constructor for the MemoryStream
     * @param contents The array from which to read.
     * @param options An optional set of readable stream options.
     */
    constructor(private readonly contents: Uint8Array, options?: ReadableOptions) {
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
