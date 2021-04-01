import * as fs from 'fs-extra';
import { match } from 'node:assert';
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

export interface KapPalette {
    [index: number]: number;
}

export interface KapMetadata {
    readonly palette?: KapPalette;
}

export interface KapChart {
    readonly binarySection?: KapRasterRow[];

    readonly metadata?: KapMetadata;

    readonly textSection?: string;
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

        const regex = /RGB\/(?<index>\d+),(?<r>\d+),(?<g>\d+),(?<b>\d+)\r\n/gm;
        let matches: RegExpExecArray | null;
        
        const palette: KapPalette = {};

        do {
            matches = regex.exec(textSection);

            if (matches) {
                const index = parseInt(matches.groups!['index'], 10);
                const r = parseInt(matches.groups!['r'], 10);
                const g = parseInt(matches.groups!['g'], 10);
                const b = parseInt(matches.groups!['b'], 10);

                const rgb = (r << 16) | (g << 8) | b;

                palette[index] = rgb;
            }

        } while (matches);

        // Skip redundant image depth.
        // TODO: Verify match to text section.
        const bitDepth = stream.next()!;

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
                const value = readRasterRun(stream, bitDepth);

                runs.push(value);
            }

            stream.next();

            rows.push({ rowNumber, runs });
        }

        // const binarySection =
        //     rows.map(row => row.map(n => n.toString(16)).join(' ')).join('\n');

        return { metadata: { palette }, textSection, binarySection: rows };
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

function readRasterRun(stream: KapStream, bitDepth: number): KapRasterRun {
    // 0000 1111
    // 1000 0000 = 128
    // 1100 0000
    // 1110 0000
    // 1111 0000

    // 0111 1000
    let colorIndexMask = 0;

    for (let i = 0; i < bitDepth; i++) {
        colorIndexMask += Math.pow(2, i);
    }

    colorIndexMask <<= (bitDepth - 1); 

    const value = readVariableLengthValue(stream);
    const colorIndex = (value[0] & colorIndexMask) >>> (7 - bitDepth);

    let lengthMask = 0;

    // 0000 0111

    for (let i = 0; i < 7 - bitDepth; i++) {
        lengthMask += Math.pow(2, i);
    }

    let length = 1;

    for (let i = value.length - 1, j = 0; i >= 0; i--, j++) {
        let v = value[i];
        
        if (i === 0) {
            v &= lengthMask;
        }

        length += v * Math.pow(128, j);
    }

    return { colorIndex, length };
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

function printRun(run: KapRasterRun): string {
    return `[${run.colorIndex} ${run.length}]`;
}

async function go() {
    const kapBuffer = await fs.readFile(kapFileName);

    const kapChart = readChart(kapBuffer);

    console.log(kapChart?.textSection);

    if (kapChart?.binarySection) {
        kapChart.binarySection.forEach(
            row => {
                console.log(`${row.rowNumber}: ${row.runs.map(run => printRun(run)).join(' ')}`);
            });
    }
}

go();
