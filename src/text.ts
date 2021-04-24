// Copyright (c) Phillip Hoff <phillip@orst.edu>.
// Licensed under the MIT license.

export interface KapTextEntry {
    entryType: string;
    lines: string[];
}

export function parseTextSegment(textSegment: string): KapTextEntry[] {
    const lines = textSegment.split('\r\n');

    return parseTextSegmentEntries(lines);
}

export function parseTextSegmentEntries(lines: string[]): KapTextEntry[] {
    const entries: KapTextEntry[] = [];
    
    let currentEntry: KapTextEntry;

    function startEntry(entry: KapTextEntry) {
        entries.push(entry);

        currentEntry = entry;
    }

    for (let line of lines) {
        if (line.length === 0) {
            continue;
        } else if (line[0] === '!') {
            startEntry({ entryType: '!', lines: [line.substr(1)] });
        } else if (line.length >= 4 && line[0] === ' ' && line[1] === ' ' && line[2] === ' ' && line[3] === ' ') {
            // TODO: Assert currentEntry !== undefined.
            currentEntry!.lines.push(line.substr(4));
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
