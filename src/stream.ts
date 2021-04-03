export default class KapStream {
    private _index: number = 0;

    constructor(private readonly contents: Uint8Array) {
    }

    get hasNext(): boolean {
        return this._index < this.contents.length;
    }

    next(): number | undefined {
        if (this.hasNext) {
            return this.contents[this._index++];
        } else {
            return undefined;
        }
    }

    peek(offset: number = 0): number {
        return this.contents[this._index + offset];
    }

    indexOf(values: number[]): number | undefined {
        for (let indexOfValues = this._index; indexOfValues < this.contents.length - values.length; indexOfValues++) {
            let i = 0;

            for (; i < values.length; i++) {
                if (this.contents[indexOfValues + i] !== values[i]) {
                    break;
                }
            }

            if (i === values.length) {
                return indexOfValues;
            }
        }

        return undefined;
    }

    readUntil(values: number[], options?: { consumeValues?: boolean }): Uint8Array | undefined {
        const index = this.indexOf(values);

        if (index === undefined) {
            return undefined;
        }

        const buffer = this.contents.slice(this._index, index - this._index);

        if (options?.consumeValues) {
            this.seek(index + values.length);
        }

        return buffer;
    }

    seek(position: number): number {
        this._index = Math.min(this._index + position, this.contents.length);

        return this._index;
    }

    get position(): number {
        return this._index;
    }
}
