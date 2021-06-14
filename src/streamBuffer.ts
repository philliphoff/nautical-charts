export default class StreamBuffer {
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
