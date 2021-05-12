# nautical-charts

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/philliphoff/nautical-charts/CI)
![npm](https://img.shields.io/npm/v/nautical-charts)
![GitHub](https://img.shields.io/github/license/philliphoff/nautical-charts)

A pure JavaScript library for reading nautical chart files. In particular, for reading BSB-formatted (`.bsb` and `.kap`) files.

## Installation

```bash
$ npm install nautical-charts --save
```

## API Reference
## Classes

<dl>
<dt><a href="#MemoryStream">MemoryStream</a></dt>
<dd><p>A readable stream for an in-memory byte array.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#parseChart">parseChart(stream)</a> ⇒</dt>
<dd><p>Parses a BSB chart from a readable (e.g. file) stream.</p>
</dd>
<dt><a href="#parseMetadata">parseMetadata(textSegment)</a> ⇒</dt>
<dd><p>Parses the text segment of a BSB chart and returns well-known metadata, if present.</p>
</dd>
<dt><a href="#writeRasterSegment">writeRasterSegment(rasterSegment, palette, buffer, bufferWidth)</a></dt>
<dd><p>Writes the RLE encoded raster data of a BSB chart to a bitmap.</p>
</dd>
</dl>

<a name="MemoryStream"></a>

## MemoryStream
A readable stream for an in-memory byte array.

**Kind**: global class  
<a name="new_MemoryStream_new"></a>

### new MemoryStream(contents, options)
The constructor for the MemoryStream


| Param | Description |
| --- | --- |
| contents | The array from which to read. |
| options | An optional set of readable stream options. |

<a name="parseChart"></a>

## parseChart(stream) ⇒
Parses a BSB chart from a readable (e.g. file) stream.

**Kind**: global function  
**Returns**: A BSB chart.  

| Param | Description |
| --- | --- |
| stream | The stream from which to read the chart data. |

<a name="parseMetadata"></a>

## parseMetadata(textSegment) ⇒
Parses the text segment of a BSB chart and returns well-known metadata, if present.

**Kind**: global function  
**Returns**: The metadata parsed from the chart.  

| Param | Description |
| --- | --- |
| textSegment | The text entries of the chart. |

<a name="writeRasterSegment"></a>

## writeRasterSegment(rasterSegment, palette, buffer, bufferWidth)
Writes the RLE encoded raster data of a BSB chart to a bitmap.

**Kind**: global function  

| Param | Description |
| --- | --- |
| rasterSegment | The rows of raster data for the chart. |
| palette | The palette from which to obtain pixel values. |
| buffer | The bitmap buffer in which to write the chart raster data. |
| bufferWidth | The width of the bitmap buffer. |


## License

MIT (see [LICENSE.md](LICENSE.md))