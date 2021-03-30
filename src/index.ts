import * as fs from 'fs-extra';
import { TextDecoder } from 'util';

const kapFileName = './samples/18400/18400_1.kap';

const decoder = new TextDecoder();

export interface KapRasterRun {
    colorIndex: number;
    length: number;
}

export interface KapRasterRow {
    readonly rowNumber: number;
    readonly runs: KapRasterRun[];
}

export interface KapChart {
    readonly textSection: string;
    readonly binarySection?: KapRasterRow[];
}

class KapStream {
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

    get position(): number {
        return this._index;
    }
}

function readChart(contents: Uint8Array): KapChart | undefined {
    const stream = new KapStream(contents);

    let firstByte = stream.next();
    let secondByte = stream.next();

    if (firstByte === undefined) {
        return { textSection: '' };
    } else if (secondByte === undefined) {
        return { textSection: decoder.decode(Buffer.from([firstByte])) }
    } else {
        while ((firstByte !== 0x1A || secondByte !== 0x00) && stream.hasNext) {
            firstByte = secondByte;
            secondByte = stream.next();
        }

        const textSection = decoder.decode(contents.slice(0, stream.position - 2));

        // Skip redundant image depth.
        // TODO: Verify match to text section.
        const bitField = stream.next();

        const rows: KapRasterRow[] = [];

        const isEndOfRasterData =
            () =>
                stream.peek(0) === 0x00
                && stream.peek(1) === 0x00
                && stream.peek(2) === 0x00
                && stream.peek(3) === 0x00;

        while (stream.hasNext && !isEndOfRasterData()) {
            const rowNumber = readRowNumber(stream);

            const runs: KapRasterRun[] = [];

            while (stream.hasNext && stream.peek(0) !== 0x00) {
                const value = readRasterRun(stream);

                runs.push(value);
            }

            stream.next();

            rows.push({ rowNumber, runs });
        }

        // const binarySection =
        //     rows.map(row => row.map(n => n.toString(16)).join(' ')).join('\n');

        return { textSection, binarySection: rows };
    }
}

function readVariableLengthValue(stream: KapStream): number[] {
    const row = [];

    let current;

    do
    {
        current = stream.next();

        if (current !== undefined) {
            row.push(current & 0x7F);
        }
    } while (current !== undefined && current > 127);

    return row;
}

function readRowNumber(stream: KapStream): number {
    const value = readVariableLengthValue(stream);

    let number = 0;

    for (let i = value.length - 1, pow = 0; i >= 0; i--, pow++) {
        number += value[i] * Math.pow(128, pow);
    }

    return number;
}

function readRasterRun(stream: KapStream): KapRasterRun {
    const value = readVariableLengthValue(stream);

    return { colorIndex: 0, length: 0 };
}

function toHexString(binary: number[]): string {
    return binary.map(
        byte => {
            const value = byte.toString(16).toUpperCase();

            if (value.length === 1) {
                return '0' + value;
            } else {
                return value;
            }
        }).join(' ');
}

async function go() {
    const kapBuffer = await fs.readFile(kapFileName);

    const kapChart = readChart(kapBuffer);

    console.log(kapChart?.textSection);

    if (kapChart?.binarySection) {
        kapChart.binarySection.forEach(
            row => {
                console.log(row.rowNumber);
            });
    }
}

go();
