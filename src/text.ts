// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

/**
 * A single entry within a BSB chart text segment, including all lines of text associated with the entry type.
 */
export interface BsbTextEntry {

    /**
     * The type of this entry.
     */
    readonly entryType: string;

    /**
     * All lines of text associated with the entry type.
     */
    readonly lines: string[];
}

export function parseTextSegment(textSegment: string): BsbTextEntry[] {
    const lines = textSegment.split('\r\n');

    return parseTextSegmentEntries(lines);
}

const continuationToken = '    ';

export function parseTextSegmentEntries(lines: string[]): BsbTextEntry[] {
    const entries: BsbTextEntry[] = [];
    
    let currentEntry: BsbTextEntry;

    function startEntry(entry: BsbTextEntry) {
        entries.push(entry);

        currentEntry = entry;
    }

    for (let line of lines) {
        if (line.length === 0) {
            continue;
        } else if (line[0] === '!') {
            startEntry({ entryType: '!', lines: [line.substr(1)] });
        } else if (line.startsWith(continuationToken)) {
            // TODO: Assert currentEntry !== undefined.
            currentEntry!.lines.push(line.substr(continuationToken.length));
        } else {
            const entryTypeRegex = /^(?<entryType>[^\/]+)\//g.exec(line);

            if (entryTypeRegex) {
                const entryType = entryTypeRegex.groups!['entryType'];

                startEntry({ entryType, lines: [line.substr(entryType.length + 1)] });
            } else {
                startEntry({ entryType: '<unknown>', lines: [line] });
            }
        }
    }

    return entries;
}
