import { KapTextEntry } from "./text";

export interface KapPalette {
    [index: number]: { r: number; g: number; b: number, a?: number };
}

export interface KapMetadata {
    readonly height?: number;
    readonly palette?: KapPalette;
    readonly width?: number;
}

function parseHeightAndWidth(textSegment: KapTextEntry[]): { height?: number, width?: number } {
    const header = textSegment.find(entry => entry.entryType === 'BSB');

    if (header) {
        const regex = /RA=(?<width>\d+),(?<height>\d+)/;

        for (let line of header.lines) {
            const match = regex.exec(line);

            if (match) {
                return {
                    height: parseInt(match.groups!['height'], 10),
                    width: parseInt(match.groups!['width'], 10)
                };
            }
        }
    }

    return {};
}

export function parseMetadata(textSegment: KapTextEntry[]): KapMetadata {
    const palette: KapPalette = {};

    for (let rgbEntry of textSegment.filter(entry => entry.entryType === 'RGB')) {
        const regex = /^(?<index>\d+),(?<r>\d+),(?<g>\d+),(?<b>\d+)$/;

        const match = regex.exec(rgbEntry.lines[0]);
        
        if (match) {
            const index = parseInt(match.groups!['index'], 10);
            const r = parseInt(match.groups!['r'], 10);
            const g = parseInt(match.groups!['g'], 10);
            const b = parseInt(match.groups!['b'], 10);

            palette[index] = { r, g, b };
        }
    }

    const { height, width } = parseHeightAndWidth(textSegment);

    return {
        height,
        palette,
        width
    };
}
