import { KapTextEntry } from "./text";

export interface KapPalette {
    [index: number]: { r: number; g: number; b: number, a?: number };
}

export interface KapMetadata {
    readonly palette?: KapPalette;
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

    return { palette };
}
