import * as fs from 'fs-extra';
import { TextDecoder } from 'util';

const kapFileName = './samples/18400/18400_1.kap';

const decoder = new TextDecoder();

export interface KapRasterRow {
    readonly rowNumber: number[];
    readonly runs: number[][];
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
        stream.next();

        const rows: KapRasterRow[] = [];

        while (stream.hasNext) {
            const rowNumber = readRowNumber(stream);

            const runs: number[][] = [];

            while (true) {
                const value = readRowValue(stream);

                if (value) {
                    runs.push(value);
                } else {
                    break;
                }
            }

            rows.push({ rowNumber, runs });
        }

        // const binarySection =
        //     rows.map(row => row.map(n => n.toString(16)).join(' ')).join('\n');

        return { textSection, binarySection: rows };
    }
}

function readRowNumber(stream: KapStream): number[] {
    const row = [];

    while (true) 
    {
        const next = stream.next();

        if (next !== undefined) {
            row.push(next);
        }

        if (next === undefined || next < 128) {
            break;
        }
    }

    return row;
}

function readRowValue(stream: KapStream): number[] | undefined {
    let colorIndex = stream.next();

    if (colorIndex === undefined || colorIndex === 0x00) {
        return undefined;
    }

    let length = 1;

    if (colorIndex > 127) {
        colorIndex = colorIndex & 0x7F;
        
        const next = stream.next();
        
        if (next !== undefined) {
            length = next;
        }
    }

    return [colorIndex, length];
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
        }).join('');
}

async function go() {
    const kapBuffer = await fs.readFile(kapFileName);

    const kapChart = readChart(kapBuffer);

    console.log(kapChart?.textSection);

    if (kapChart?.binarySection) {
        kapChart.binarySection.forEach(
            row => {
                console.log(toHexString(row.rowNumber))
            });
    }
}

go();
