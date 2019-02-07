declare let HEVCMerger
declare let Chart

class PlayerDemonstration {
    // constants
    private _CONTENT_URL

    // indexes
    private _index_video: number
    private _index_grid: number

    // content options
    private _content_name: string
    private _content_grid_size: number[]
    private _content_url_scheme: string
    private _content_base_track_number: number
    private _content_video_tracks_numbers: number[]
    private _content_nb_segments: number
    private _content_update_dash_init: boolean
    private _content_dash_init: string
    private _content_bitrates: number[]
    private _content_ratio: number[]

    // demo options
    private _demo_view_port: number[]
    private _demo_start: string
    private _demo_fading_level: number
    private _demo_grid: boolean
    private _demo_mode: string
    private _demo_reload: boolean

    // controls vars
    private _controls_current_matrix: number[]

    // player / MSE vars
    private _player_current_segment: any
    private _player_stored_segment: any[]
    private _player_source_buffer: SourceBuffer
    private _player_media_source: MediaSource
    private _player_video: HTMLVideoElement
    private _player_last_time: number
    private _player_tiles_bytes_length: number[]
    private _player_merger: any
    private _player_container: HTMLElement

    constructor(content_list_url, index_video, index_grid) {
        this._CONTENT_URL = content_list_url
        this._index_grid = index_grid
        this._index_video = index_video
    }

    init(logs?: boolean): Promise<any> {
        if (HEVCMerger && Chart) {
            this._player_merger = new HEVCMerger(logs)
            return this._setContent().then(() => {
                this._setDemo()
              //  this._setControls()
                this._setPlayer()
            })
        }
        else if (Chart)
            console.error('HEVCMerger is missing')
        else
            console.error('Chart JS is missing')
    }

    private _setContent(): Promise<any> {
        return fetch(this._CONTENT_URL).then(d => d.json()).then(json => {
            let options = json.contents[this._index_video]

            // get all values
            this._content_grid_size = options.grids[this._index_grid].split('x').map(e => parseInt(e))
            this._content_url_scheme = options.content_url_scheme
            this._content_base_track_number = options.base_track
            this._content_video_tracks_numbers = []
            this._content_nb_segments = options.nb_segments
            this._content_update_dash_init = options.update_dash_init
            this._content_dash_init = options.dash_init
            this._content_bitrates = options.bitrates
            this._content_ratio = options.ratio
            this._content_name = options.name

            // update url shemes
            this._content_url_scheme = this._content_url_scheme.replace(new RegExp('%grid%', 'g'), options.grids[this._index_grid])
            this._content_dash_init = this._content_dash_init.replace(new RegExp('%grid%', 'g'), options.grids[this._index_grid]).replace(new RegExp('%bitrate%', 'g'), options.bitrates[0])

            // update tracks numbers
            for (let i = options.base_track + 1 * (options.base_track > 1 ? -1 : 1);
                options.base_track > 1 && i >= options.base_track - this._content_grid_size[0] * this._content_grid_size[1] ||
                options.base_track <= 1 && i <= options.base_track + this._content_grid_size[0] * this._content_grid_size[1];
                i = i + 1 * (options.base_track > 1 ? -1 : 1)
            ) this._content_video_tracks_numbers.push(i)
        })
    }

    private _setDemo(): void {
        // for demo, reload the page when # changes
        window.onhashchange = () => { location.reload() }

        //this._demo_tiles_level = []
        //this._demo_global_level = 0

        this._demo_mode = 'viewport'
        this._demo_view_port = [200, 200]
        this._demo_grid = false
        this._demo_fading_level = 0
        this._demo_start = 'highest'
        this._demo_reload = false

        let hash = window.location.hash
        hash = !hash ? '' : hash.substr(1)
        if (!hash.length) return

        // get all params
        let demo_opts = hash.split('--')
        demo_opts.forEach(o => {
            let p = o.split('=')
            if (p.length !== 2) return

            let name = p[0], value = p[1]

            if (name === 'mode') this._demo_mode = value
            else if (name === 'start') this._demo_start = value
            else if (name === 'reload') this._demo_reload = (value == 'true' || value == '1' || value == 'y')
            else if (name === 'profile') this._demo_fading_level = parseInt(value)
            else if (name === 'viewport') this._demo_view_port = value.split('x').map(s => parseInt(s))
            else if (name === "grid") this._demo_grid = (value == 'true' || value == '1' || value == 'y')
        })
    }

    private _setData(name: string, value: string): void {
        let e = document.querySelectorAll('[data="' + name + '"]')
        for (let i = 0; i < e.length; i++) e[i].innerHTML = value
    }

    private _setPlayer(): void {
        this._player_current_segment = 'init'
        this._player_source_buffer = undefined
        this._player_media_source = new MediaSource()
        this._player_stored_segment = []
        this._player_video = document.getElementsByTagName('video')[0]
        this._player_last_time = 0
        this._player_container = document.getElementById('container')

        this._player_video.src = window.URL.createObjectURL(this._player_media_source)

        this._player_media_source.addEventListener('sourceopen', e => {
            this._player_source_buffer = this._player_media_source.addSourceBuffer('video/mp4; codecs="hev1.1.6.L186.80"')

            console.log("Source is open")

            this._player_source_buffer.addEventListener('updateend', () => {
                //console.log(this._player_current_segment)
                if (this._player_current_segment > 2)
                    setTimeout(() => {

                        try {
                            let old = this._player_last_time
                            this._player_last_time = this._player_video.buffered.end(0)

                            setTimeout(() => {

                                if (!this._playerAppend() && this._demo_reload) {
                                    console.log("Reloading")
                                    // nothing more to append, reload in 5000ms
                                    setTimeout(() => {
                                        location.reload()
                                    }, 3000)
                                }
                            },1000)
                        }
                        catch (e) {
                            console.error(e)
                            this._playerAppend()
                        }
                    })
                else
                    this._playerAppend()
            })

            this._playerAppend()
        }, false)
    }

    private _playerAppend(): boolean {
        if (this._player_current_segment === "init" && (this._player_current_segment = 1)) {
            this._playerLoadInit().then(arrayBuffer => this._player_source_buffer.appendBuffer(arrayBuffer))
            return true
        }
        else if (this._player_current_segment <= this._content_nb_segments) {
            this._playerLoadSegment().then(arrayBuffer => this._player_source_buffer.appendBuffer(arrayBuffer))
            return true
        }
        else
            return false
    }

    private _playerLoadSegment(): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            let stats = {
                bytes: [],
                download: 0,
                merging: 0,
                segment_duration: 0
            }

            let segment_number = this._player_current_segment
            let buffers = []
            let promises = []
            let start = Date.now()
            let scheme = this._content_url_scheme.replace('%segment%', segment_number + '')

            console.log("Grid: "+this._content_grid_size[0]+"x"+this._content_grid_size[1]);

            //console.log(stored_segments)
            for (let i = 0; i < this._content_grid_size[0] * this._content_grid_size[1]; i++){

                    let url = scheme.replace(new RegExp('%bitrate%', 'g'), this._content_bitrates[0] + '')
                    .replace('%tile%', this._content_video_tracks_numbers[i] + '');

                    console.log("Fetch: "+url);

                    promises.push(fetch(url).then(r => r.arrayBuffer())
                        .then(arrayBuffer => {
                            stats.bytes[i] = arrayBuffer.byteLength
                            buffers[i] = arrayBuffer
 
                        }))
                    }
                        let url = scheme.replace(new RegExp('%bitrate%', 'g'), this._content_bitrates[0] + '')
                        .replace('%tile%', this._content_base_track_number + '');
            
                        console.log("Fetch: "+url);

                        promises.push(fetch(url).then(r => r.arrayBuffer())
                .then(arrayBuffer => {
                    stats.bytes[this._content_grid_size[0] * this._content_grid_size[1]] = arrayBuffer.byteLength
                    return buffers[this._content_grid_size[0] * this._content_grid_size[1]] = arrayBuffer
                }))
           

            Promise.all(promises).then(r => {
                try {
                    let step = Date.now()
                    stats.download = step - start
                    //console.log("== content 10 segment files downloaded in " + (step - start) + "ms")
                    // timeout here to feed the buffers var before resolving the promise
                    let merged_content = this._player_merger.merge(buffers, segment_number)
                    stats.merging = Date.now() - step
                  //  this._panel_stats_data[(<any>segment_number) - 1] = stats

                    //console.log("== content 10 segment files merged together in " + (Date.now() - step) + "ms")
                    this._player_current_segment += 1
                    resolve(merged_content)
                }
                catch (e) {
                    console.error(e)
                }
            })
        })
    }

    private _playerLoadInit(): Promise<ArrayBuffer> {
        // load dash init
        if (this._content_update_dash_init)
            return fetch(this._content_dash_init).then(r => r.arrayBuffer()).then(arrayBuffer => this._player_merger.update(arrayBuffer))
        else
            return fetch(this._content_dash_init).then(r => r.arrayBuffer())
    }
}