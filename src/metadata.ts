// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

import { BsbTextEntry } from "./text";

export interface BsbCoordinate {
    readonly latitude: number;
    readonly longitude: number;
}

export interface BsbColor {
    r: number;
    g: number;
    b: number,
    a?: number;
}

/**
 * A palette for a BSB chart.
 */
export interface BsbPalette {

    /**
     * @param index The (1-based) index of a color within the palette.
     * @returns A color in RGBA notation.
     */
    readonly [index: number]: BsbColor;
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
    readonly border?: BsbCoordinate[];

    /**
     * The primary palette of the chart.
     */
    readonly palette?: BsbPalette;
    
    /**
     * The size of the chart.
     */
    readonly size?: BsbSize;
}

function parseBorder(entries: BsbTextEntry[], metadata: BsbMetadata): BsbMetadata {
    const regex = /(?<order>\d+),(?<latitude>[-+]?(\d*\.?\d+|\d+)),(?<longitude>[-+]?(\d*\.?\d+|\d+))/;

    const coordinates: { order: number, coordinate: BsbCoordinate }[] = [];

    for (let entry of entries) {
        for (let line of entry.lines) {
            const match = regex.exec(line);

            if (match) {
                const order = parseInt(match.groups!['order'], 10);
                const latitude = parseFloat(match.groups!['latitude']);
                const longitude = parseFloat(match.groups!['longitude']);

                coordinates.push({ order, coordinate: { latitude, longitude }});
            }
        }
    }

    if (coordinates.length) {
        return {
            ...metadata,
            border: coordinates.map(coordinate => coordinate.coordinate)
        };
    }

    return metadata;
}

function parseSize(entries: BsbTextEntry[], metadata: BsbMetadata): BsbMetadata {
    const regex = /RA=(?<width>\d+),(?<height>\d+)/;

    for (let entry of entries) {
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
    }

    return metadata;
}

export function parsePalette(entries: BsbTextEntry[], metadata: BsbMetadata): BsbMetadata {
    const regex = /^(?<index>\d+),(?<r>\d+),(?<g>\d+),(?<b>\d+)$/;

    const palette: { [key: number]: BsbColor } = {};

    for (let entry of entries) {
        for (let line of entry.lines) {
            const match = regex.exec(entry.lines[0]);
    
            if (match) {
                const index = parseInt(match.groups!['index'], 10);
                const r = parseInt(match.groups!['r'], 10);
                const g = parseInt(match.groups!['g'], 10);
                const b = parseInt(match.groups!['b'], 10);
        
                palette[index] = {r, g, b};
            }
        }
    }

    if (Object.keys(palette).length) {
        return {
            ...metadata,
            palette
        };
    }

    return metadata;
}

const typeParsers: { [key:string]: (entries: BsbTextEntry[], metadata: BsbMetadata) => BsbMetadata } = {
    BSB: parseSize,
    PLY: parseBorder,
    RGB: parsePalette
};

/**
 * Parses the text segment of a BSB chart and returns well-known metadata, if present.
 * @param textSegment The text entries of the chart.
 * @returns The metadata parsed from the chart.
 */
export function parseMetadata(textSegment: BsbTextEntry[]): BsbMetadata {
    let metadata: BsbMetadata = {};

    const typeEntries = textSegment.reduce<{ [key: string]: BsbTextEntry[] }>(
        (previous, current) => {
            const types = previous[current.entryType] ?? [];

            types.push(current);

            previous[current.entryType] = types;

            return previous;
        },
        {});

    for (let type in typeEntries) {
        const typeParser = typeParsers[type];

        if (typeParser) {
            metadata = typeParser(typeEntries[type], metadata);
        }
    }

    return metadata;
}