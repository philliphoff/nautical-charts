# nautical-charts

![npm](https://img.shields.io/npm/v/nautical-charts)
![GitHub](https://img.shields.io/github/license/philliphoff/nautical-charts)

A pure JavaScript library for reading nautical chart files. In particular, for reading BSB-formatted (`.bsb` and `.kap`) files.

## Installation

```bash
$ npm install nautical-charts --save
```

## API

> This API is in considerable flux, subject to drastic change, and therefore has not been fully documented.

### `readChart(contents: Uint8Array): KapChart | undefined`

Parses a chart from the contents of a buffer.

### `writeRasterSegment(rasterSegment: KapRasterRow[], palette: KapPalette, buffer: Buffer, bufferWidth: number): void`

Writes the (run-length-encoded, or RLE format) raster segment of a chart to a buffer in bitmap (i.e. RGBA) format. This function is useful for converting the chart to a more accessable format (such as PNG, via [pngjs](https://www.npmjs.com/package/pngjs)).

## Types

> These types are in considerable flux, subject to drastic change, and therefore have not been fully documented.

### `interface KapChart`

A parsed BSB chart.

#### `readonly metadata?: KapMetadata;`

Metadata related to the chart specifically parsed from the text segment.

#### `readonly rasterSegment?: KapRasterRow[];`

The rows that make up the raster segment of the chart.

#### `readonly textSegment?: KapTextEntry[];`

The partially-processed entries that make up the text segment.

## License

MIT (see [LICENSE.md](LICENSE.md))