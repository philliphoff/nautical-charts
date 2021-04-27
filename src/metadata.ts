// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

import { BsbTextEntry } from "./text";

/**
 * A palette for a BSB chart.
 */
export interface BsbPalette {

    /**
     * @param index The (1-based) index of a color within the palette.
     * @returns A color in RGBA notation.
     */
    readonly [index: number]: { r: number; g: number; b: number, a?: number };
}

/**
 * The size of the BSB chart.
 */
export interface BsbSize {

    /**
     * The height (in pixels) of the raster data of the chart.
     */
    readonly height?: number;

    /**
     * The width (in pixels) of the raster data of the chart.
     */
    readonly width?: number;
}

/**
 * Metadata related to a BSB chart, as parsed from its text segment.
 */
export interface BsbMetadata {

    /**
     * The primary palette of the chart.
     */
    readonly palette?: BsbPalette;
    
    /**
     * The size of the chart.
     */
    readonly size?: BsbSize;
}

function parseSize(entry: BsbTextEntry, metadata: BsbMetadata): BsbMetadata {
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

export function parsePalette(entry: BsbTextEntry, metadata: BsbMetadata): BsbMetadata {
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

const typeParsers: { [key:string]: (entry: BsbTextEntry, metadata: BsbMetadata) => BsbMetadata } = {
    BSB: parseSize,
    RGB: parsePalette
};

/**
 * Parses the text segment of a BSB chart and returns well-known metadata, if present.
 * @param textSegment The text entries of the chart.
 * @returns The metadata parsed from the chart.
 */
export function parseMetadata(textSegment: BsbTextEntry[]): BsbMetadata {
    let metadata: BsbMetadata = {};

    for (let entry of textSegment) {
        const parser = typeParsers[entry.entryType];

        if (parser) {
            metadata = parser(entry, metadata);
        }
    }

    return metadata;
}