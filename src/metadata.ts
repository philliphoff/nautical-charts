// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

import { BsbTextEntry } from "./text";

export interface KapPalette {
    [index: number]: { r: number; g: number; b: number, a?: number };
}

export interface KapSize {
    readonly height?: number;
    readonly width?: number;
}

export interface KapMetadata {
    readonly palette?: KapPalette;
    readonly size?: KapSize;
}

function parseHeightAndWidth(entry: BsbTextEntry, metadata: KapMetadata): KapMetadata {
    const regex = /RA=(?<width>\d+),(?<height>\d+)/;

    for (let line of entry.lines) {
        const match = regex.exec(line);

        if (match) {
            return {
                ...metadata,
                size: {
                    height: parseInt(match.groups!['height'], 10),
                    width: parseInt(match.groups!['width'], 10)
                }
            };
        }
    }

    return metadata;
}

export function parseKapPalette(entry: BsbTextEntry, metadata: KapMetadata): KapMetadata {
    const regex = /^(?<index>\d+),(?<r>\d+),(?<g>\d+),(?<b>\d+)$/;

    const match = regex.exec(entry.lines[0]);
    
    if (match) {
        const index = parseInt(match.groups!['index'], 10);
        const r = parseInt(match.groups!['r'], 10);
        const g = parseInt(match.groups!['g'], 10);
        const b = parseInt(match.groups!['b'], 10);

        return {
            ...metadata,
            palette: {
                ...metadata.palette,
                [index]: {r, g, b}
            }
        };
    }

    return metadata;
}

const typeParsers: { [key:string]: (entry: BsbTextEntry, metadata: KapMetadata) => KapMetadata } = {
    BSB: parseHeightAndWidth,
    RGB: parseKapPalette
};

export function parseKapMetadata(textSegment: BsbTextEntry[]): KapMetadata {
    let metadata: KapMetadata = {};

    for (let entry of textSegment) {
        const parser = typeParsers[entry.entryType];

        if (parser) {
            metadata = parser(entry, metadata);
        }
    }

    return metadata;
}