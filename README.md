# Demonstration - HEVC Tiles Merger

HEVC Tiles Merger is a tool written in pure JavaScript (browser and nodeJS compliant) that handles as input a tiled and split HEVC Content and gives back as output a tiled but not split HEVC Content. If a tiled and split HEVC Content cannot be decoded by the native HEVC Decoder (from Edge for instance), a not split tiled Content can be decoded.

Here is the key point of the demonstration: fetch split tiles in different qualities according to the current matrix and use the merger to be able to play all the tiles together using the native HEVC Decoder.

In this demonstration, the content is tiled and some controls over the video object let the user change the quality of each tile. By changing the quality of one tile, the matrix is updated and tiles will be downloaded according to the matrix. 

## Running the demo

To run the demo, just follow these few steps:
- get repository's files (using git clone for instance)
- serve files (using [https://www.npmjs.com/package/serve](NodeJS Serve) package or Apache)
- go to the `index.html`, like http://localhost:5000/index.html

### Parameters

By running the demo, some parameters can be useful:

Parameters should be put after the hashtag, following this way:

`http://localhost:5000/index.html#--param-name=param-value--second-param-name=second-param-value`

|               | Type    | Default  | Description                                                                                                                                                                                                                                                       |
|---------------|---------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `content-index` | `number`  | 0        | The index of the content as described in media/media.json. If no index is specified, the first available content will be chosen.                                                                                                                                   |
| `grid-index`    | `number`  | 0        | The index of the grid as described in media/media.json. If no index specified, the first available grid will be used.                                                                                                                                             |
| `reload` | `boolean`  | false        | The page reaload when the video is ended.                                                                                                                                   |
| `grid`          | `boolean` | false    | If true, the grid is shown on top of the video. The grid lets you check tiles' quality and bitrates. This option can be changed directly below the player.                                                                                                             |
| `mode`          | `string`  | "viewport" | Mode can be viewport or buttons. "viewport" displays a white square representing the current point of view and change the quality of tiles according to this point of view. "buttons" displays some controls on top of the video to control the quality of each tile. This parameter can be changed directly below the player |
| `start`         | string  | highest  | Can be highest or lowest and describes the whole video quality at the beginning                                                                                                                                                                                   |
| `fading-level`  | `number`  | 0        | **not implemented**. Describes the behavior of the viewport. If 0, tiles being watched will take the highest quality and the others the lowest one. If fading-level is 1, the closest tiles from the watched tiles will have the best quality minus one. etc...                      |
| `viewport-size` | `string`  | "200x200"  | The size (width x height in pixels) of the viewport.                                                                                                                                                                                                              |

### During the video

The user can change tiles' quality (if more than one is available) by using the viewport or buttons. The concerned tiles will be downloaded in the desired quality and merged together. At the end of the video, the video restarts 5 seconds after. When the video restarts, the matrix remains the same but the video's buffer is cleared.

## Project Structure

In this folder, you can find:
- `css` folder with the style of the demonstration
- `js` folder with the script of the demonstration
- `libs` folder with differents used libs. HEVC Merger lib needs the ISOBoxer lib to work. The Chart.js lib is used only for demo purpose
- `media` folder contains all available demo media. These media are described in the media.json file
- `index.html` which is the entry point of the demo
- `demo.html` minamal start up project

All files expect Chart.js, ISOBoxer libs and Style Sheet are well commented.

### Supporting parameters

Note that parameters are put after a hashtag. These parameters are handled first by `index.html` (for the content and the grid) and then by the demo player.

### Demo Player File

The demo player file is written using TypeScript. To use it, you need to install NodeJS + NPM + TypeScript (general). Then you can run the command `npm run build` to build the TypeScript file.

- [https://nodejs.org/en/download/package-manager/](Installing NodeJS)
- [https://www.typescriptlang.org/#download-links](Installing TypeScript)

## How HEVC Merger Works

To merge HEVC Content, 2 steps are useful

### Updating the DASH Init file

In this file, the box `hvc2` (which is unknown) is renamed `hvc1` which is known. The function's signature is the following:

```javascript
/*
    @input:
        - init_segment: ArrayBuffer
        - option: Number, optionnal, 1 = remove tracks
    @output:
        - updated_init_segment: ArrayBuffer
*/
function update(init_segment, option)
```

Tracks are found in the DASH init of the split tiled content (contains N + 1 tracks). The option set to 1 removes tracks' boxes. Letting these informations doesn't make the merged segment undecodable. *But it could.*

### Merging one Segment

If the video contains N Tiles, then N + 1 tracks will be used (because of the base track). The merge function of the merger take as input N + 1 `ArrayBuffer`, the current segments number and the strict mode, then gives back **synchronously** the merged segment as an JavaScript `Uint8Array`:

```javascript
/*
    @input:
        - segments_buffers: Array<ArrayBuffer>
        - current_segment: Number, Segment number you are merging, required only if strict mode 
        - strict: boolean, update SDIX and MFHD boxes. Working without
    @output:
        - merged_segment: Uint8Array, return the merged content
*/
function merge(segments_buffers, current_segment, strict = false);
```

Note: the property `.buffer` of the `Uint8Array` is an `ArrayBuffer`.

The strict mode can be used if needed to remove some informations that are used only if the content is split. Letting these informations doesn't make the merged segment undecodable. *But it could.*

### Using the HEVC Merger with NodeJS

Nothing special, follow these steps:
- import `codem-isoboxer` package from `npm`, [https://github.com/madebyhiro/codem-isoboxer](Github repository)
- import write a short module to export the `hevc_merger.js` functions
- use it directly in NodeJS

Note: NodeJS buffers needs to be cast to ArrayBuffers, see [https://stackoverflow.com/a/12101012/5407324](this Stackoverflow Answer).

## Generating HEVC Tiled Content

3 differents tools are used to generate the content:
- `ffmpeg` to convert MP4 to YUV, [https://www.ffmpeg.org/download.html](installation)
- `Kvazaar` to convert YUV to HEVC tiled, [https://github.com/ultravideo/kvazaar](Github)
- `MP4Box` to convert the HEVC to MP4 and DASH it, [https://gpac.wp.imt.fr/downloads/](installation)

The procedure described below comes from [](GPAC Blog)

### Constraints

HEVC is for the moment, only supported by Edge Browser and ChromeCAST Ultra. Here are some constraints:
- Edge's maximal resolution is 4K content
- ChromeCAST Ultra maximal profile supported is: HEVC / H.265 Main and Main10 Profiles up to level 5.1 (2160p/60fps)

If you do not respect these contraints, JavaScript MSE will return an error.

### From MP4 to YUV

`ffmpeg -i my_video.avi hugefile.yuv` Generates a YUV from the input video. If needed, you can change here the resolution.

Note: YUV file is very large.

### From YUV to HEVC Tiled

`kvazaar -i hugefile.yuv --input-res=1920x1080 --bitrates=30000000 --tiles 3x3 --slices tiles --mv-constraint frametilemargin -o tiled.265` will create a tiled HEVC file. This one should be playable by `ffplay`

Note: use `ffprobe` on the base file to get the default bitrate. Then you can choose lower bitrates (to downgrade the video quality). Don't forget to put the `input-res` which is the resolution of the content.

### From HEVC to MP4

`mp4box -add tiled.h265:split_tiles -new video_tiled.mp4` creates a new MP4 file with 10 video tracks inside. This file is not playable.

### From MP4 to DASH

`mp4box -dash 1000 -profile live -out dash_tiled.mpd video_tiled.mp4` generates the DASH Content.

Note: this DASH content can be play back using the `MP4Client`.

This DASH Process generate a MPD which is almost DASH Compliant (but the `srd` option is not well implemented yet). This MPD file **is not used in our implementation**. Instead, the content is described in `media/media.json`. See below.

### Adding the new content in the media.json file

The `media.json` file looks like:

```json
{
    "contents": [
        //... your content here
    ]
}
```

Put your content as a JSON Object with the following properties:

```json
{
    "name":                 "The content name",
    "content_url_scheme":   "media/content_folder/content_name_%grid%_dash_%bitrate%/content_name_%grid%-%bitrate%_dash_track%tile%_%segment%.m4s",
    "dash_init":            "media/content_folder/content_name_%grid%_dash_%bitrate%/dash_set1_init.mp4",
    "update_dash_init":     true,
    "nb_segments":          102,
    "base_track":           1,
    "bitrates":             [1000, 3000, 10000],
    "grids":                ["3x3"],
    "ratio":                [2,1]
}
```

- **name**: is the name of the content.
- **content_url_scheme** and **dash_init** are urls to the content. You can use %bitrate% and %grid% values that will be replaced in the url according to the current grid and bitrates. %tile% and %segment% are numbers representing respectively the track number (1 should be the base track, the others video tracks) and the segment number (should be 1 second each).
- **update_dash_init**: is true to update it. You should let **true**
- **nb_segments**: is the number of available segments
- **base_track**: is the track number of the base track. If the content is generated using Kvazaar and MP4Box, it should be the track 1.
- **bitrates** and **grids**: are the different configurations available. These values will be used to replace %bitrates% and %grid% is the url scheme
- **ratio**: is the video aspect ratio (for instance, [16,9]). This is useful only for demo purpose. It doesn't impact the content downloading, merging and playing.

To try your content, don't forget to set the options `grid-index` and `content-index` in the player's url.

## Generating pure HEVC content

First you convert the mp4 file to raw hevc content with ffmpeg. To add the audio later extract the audio with ffmpeg.
Now you can coding the video with different bitrates with ffmpeg. After that you can create and dash the mp4 file.
Dont't forget to integrate the audio into the video file. The outputted mpd file can use to stream the file in a webbrowser such as safari. Make sure your browser support the hevc codec.

Next all these steps will be described in detail.

### From MP4 to YUV

```
sudo ffmpeg -i file.mp4 file.yuv
```

### Extract audio

```
sudo ffmpeg -i file.mp4 file.aac
```

### From YUV to HEVC Tiled

`kvazaar -i hugefile.yuv --input-res=1920x1080 --bitrates=1000000 -o video1000.265` will create a HEVC file. This one should be playable by `ffplay`

Note: use `ffprobe` on the base file to get the default bitrate. Then you can choose lower bitrates (to downgrade the video quality). In this example the video will be coding with a bitrate of 1000 kbit/s. Don't forget to put the `input-res` which is the resolution of the content. 

### From HEVC to MP4

`mp4box -add video1000.265 -new video1000.mp4` creates a new MP4 file with a bitrate of 1000 kbit/s without audio.







