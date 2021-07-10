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

export interface BsbRecord {
    fileName: string;
    name: string;
    number: number;
    type: string;
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

    readonly records?: BsbRecord[];

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
            border: coordinates.sort((a, b) => a.order - b.order).map(coordinate => coordinate.coordinate)
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

type TextEntryParser = (entries: BsbTextEntry[], metadata: BsbMetadata) => BsbMetadata;
type TextEntryParserEntry = {
    test: RegExp;
    parser: TextEntryParser;
};

const textEntryParsers: TextEntryParserEntry[] = [
    { test: /^BSB$/, parser: parseSize },
    { test: /^PLY$/, parser: parseBorder },
    { test: /^RGB$/, parser: parsePalette },
]

/**
 * Parses the text segment of a BSB chart and returns well-known metadata, if present.
 * @param textSegment The text entries of the chart.
 * @returns The metadata parsed from the chart.
 */
export function parseMetadata(textSegment: BsbTextEntry[]): BsbMetadata {
    let metadata: BsbMetadata = {};

    const entryMap = new Map<TextEntryParserEntry, BsbTextEntry[]>();

    for (const entry of textSegment) {
        for (const test of textEntryParsers) {
            if (test.test.test(entry.entryType)) {
                const entries = entryMap.get(test);

                if(entries) {
                    entries.push(entry);
                } else {
                    entryMap.set(test, [entry]);
                }
            }
        }
    }

    for (const test of entryMap.keys()) {
        metadata = test.parser(entryMap.get(test)!, metadata);
    }

    return metadata;
}