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
    private _controls_grid: HTMLElement
    private _controls_grid_tiles: any[]
    private _controls_view: HTMLElement
    private _controls_container: HTMLElement
    private _controls_disable_viewport: boolean = false

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

    // panel vars
    private _panel_chart_bitrates: { datasets: any[], labels: number[], chart: any }
    private _panel_chart_downloading: { datasets: any[], labels: number[], chart: any }
    private _panel_stats_data: any[]
    private _panel_total_downloaded: number

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
                this._setControls()
                this._setPanel()
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

    private _setControls(): void {
        // set all player vars
        this._controls_current_matrix = (() => { let r = []; for (let i = 0; i < this._content_grid_size[0] * this._content_grid_size[1]; i++) { r.push(this._demo_start === 'highest' ? this._content_bitrates.length - 1 : 0) } return r })()
        this._controls_grid = document.getElementById('grid')
        this._controls_grid_tiles = []
        this._controls_container = document.getElementById('container')
        this._controls_view = document.getElementById('view')

        // set grid if needed
        //let buttons = this._demo_mode === 'buttons'
        //if (this._demo_grid) this._controls_grid.className += this._controls_grid.className ? ' shown' : 'shown'

        let buttons_html = `
                        <div class="controls">
                            <div class="plus"><span>+</span></div>
                            <div class="minus"><span>-</span></div>
                        </div>`

        let html = "", noBottom = false, noRight = false
        for (let x = 0; x < this._content_grid_size[0]; x++) {
            noBottom = x === this._content_grid_size[0] - 1
            for (let y = 0; y < this._content_grid_size[1]; y++)
                html += `
                            <div style="width:` + 100 / this._content_grid_size[1] + `%; height:` + 100 / this._content_grid_size[0] + `%; float:left;" ref="` + (x * this._content_grid_size[1] + y) + `" class="feedback ` + (noBottom ? 'no-bottom ' : '') + (y === this._content_grid_size[1] - 1 ? 'no-right ' : '') + `">
                                <h2>Tile ` + (x * this._content_grid_size[1] + y + 1) + `</h2>
                                <p class="level"></p>
                                <p class="bitrate"></p>
                                ` + buttons_html + `
                            </div>`
            html += `<div style="clear:both;"></div>`
        }

        this._controls_grid.innerHTML = html

        let tiles = this._controls_grid.querySelectorAll('[ref]')
        for (let i = 0; i < tiles.length; i++) {
            let tile = tiles[i]
            let bitrate = tile.querySelector('.bitrate')
            let level = tile.querySelector('.level')
            let tile_object = {
                tile,
                updateBitrate: b => bitrate.innerHTML = b + " kb/s",
                updateLevel: () => level.innerHTML = 'Quality ' + this._controls_current_matrix[i]
            }
            this._controls_grid_tiles.push(tile_object)
            tile_object.updateLevel()

            let ref = tile.getAttribute('ref')
            tile.querySelector('.plus').addEventListener('click', e => {
                this._controls_current_matrix[parseInt(ref)] = Math.min(this._content_bitrates.length - 1, this._controls_current_matrix[parseInt(ref)] + 1)
                tile_object.updateLevel()
            })
            tile.querySelector('.minus').addEventListener('click', e => {
                this._controls_current_matrix[parseInt(ref)] = Math.max(0, this._controls_current_matrix[parseInt(ref)] - 1)
                tile_object.updateLevel()
            })
        }

        // set the viewport if needed

        this._controls_view.style.width = this._demo_view_port[0] + 'px'
        this._controls_view.style.height = this._demo_view_port[1] + 'px'

        let last_move = 0
        let delta = 50

        this._controls_container.addEventListener('mousemove', e => {
            if (this._demo_mode.indexOf('viewport') === -1 || this._controls_disable_viewport) return
            let d = Date.now()

            let view_size = [this._controls_view.clientWidth, this._controls_view.clientHeight]
            let container_size = [this._controls_container.clientWidth, this._controls_container.clientHeight]

            //console.log(e)
            let pointer = [e.clientX - this._controls_container.offsetLeft - view_size[0] / 2, e.clientY - this._controls_container.offsetTop - view_size[1] / 2]
            //console.log(pointer)

            let left = Math.min(container_size[0] - view_size[0], Math.max(0, pointer[0]))
            let top = Math.min(container_size[1] - view_size[1], Math.max(0, pointer[1]))
            this._controls_view.style.left = left + 'px'
            this._controls_view.style.top = top + 'px'

            if (d - last_move < delta) return
            last_move = d

            let right = left + view_size[0]
            let bottom = top + view_size[1]

            // we have to check the position of each angles
            let corners = [[left, top], [right, top], [left, bottom], [right, bottom]]

            let tiles = []
            for (let i = 0; i < 4; i++) {
                let tile = Math.floor(corners[i][0] * this._content_grid_size[1] / container_size[0]) + Math.floor(corners[i][1] * this._content_grid_size[0] / container_size[1]) * this._content_grid_size[1]
                if (!i || tiles.indexOf(tile) === -1) tiles.push(tile)
            }

            //console.log(tiles)
            if (tiles.length === 2 && (tiles[0] + 1 < tiles[1] % this._content_grid_size[1] || tiles[0] + this._content_grid_size[1] < tiles[1]) || tiles.length === 4) {
                let n = []
                for (let i = Math.floor(tiles[0] / this._content_grid_size[1]); i <= Math.floor(tiles[2] / this._content_grid_size[1]); i++)
                    for (let j = tiles[0] % this._content_grid_size[1]; j <= tiles[3] % this._content_grid_size[1]; j++)
                        n.push(i * this._content_grid_size[1] + j)
                tiles = n
            }

            // update matrix
            for (let i = 0; i < this._controls_current_matrix.length; i++) {
                // change here for view port modes (fade or strict)
                let v = tiles.indexOf(i) !== -1 ? this._content_bitrates.length - 1 : 0
                this._controls_current_matrix[i] = v
            }

            if (this._demo_fading_level)
                for (let x = 0; x < this._content_grid_size[1]; x++) {
                    for (let y = 0; y < this._content_grid_size[0]; y++) {
                        let i = x + y * this._content_grid_size[0]
                        let v = this._controls_current_matrix[i]

                        if (v === 0) continue

                        if (x > 0) this._controls_current_matrix[x - 1 + y * this._content_grid_size[0]] = Math.max(this._controls_current_matrix[x - 1 + y * this._content_grid_size[0]], v - 1)
                        if (x < this._content_grid_size[1] - 1) this._controls_current_matrix[x + 1 + y * this._content_grid_size[0]] = Math.max(this._controls_current_matrix[x + 1 + y * this._content_grid_size[0]], v - 1)
                        if (y > 0) this._controls_current_matrix[x + (y - 1) * this._content_grid_size[0]] = Math.max(this._controls_current_matrix[x + (y - 1) * this._content_grid_size[0]], v - 1)
                        if (y < this._content_grid_size[0] - 1) this._controls_current_matrix[x + (y + 1) * this._content_grid_size[0]] = Math.max(this._controls_current_matrix[x + (y + 1) * this._content_grid_size[0]], v - 1)
                    }
                }
            for (let i = 0; i < this._controls_current_matrix.length; i++) {
                this._controls_grid_tiles[i].updateLevel()
            }
        })
    }

    private _setData(name: string, value: string): void {
        let e = document.querySelectorAll('[data="' + name + '"]')
        for (let i = 0; i < e.length; i++) e[i].innerHTML = value
    }

    private _updatePanel(): void {
        let five_last = this._panel_stats_data.slice(Math.max(0, this._panel_stats_data.length - 5))

        for (let i = 0; i < five_last.length; i++) {
            if (!five_last[i]) continue

            let sum = 0

            let duration = five_last[i].segment_duration

            for (let j = 0; j < five_last[i].bytes.length; j++) {
                sum += five_last[i].bytes[j]
                this._panel_chart_bitrates.datasets[j].data[i] = Math.floor(five_last[i].bytes[j] * 8 / (1000 * duration))
            }

            this._panel_chart_bitrates.datasets[five_last[i].bytes.length].data[i] = Math.floor(sum * 8 / (1000 * duration))
            this._setData('overview.bitrate', Math.floor(sum * 8 / (1000 * 1000 * duration)) + ' Mb/s')

            this._panel_chart_downloading.datasets[0].data[i] = five_last[i].download
            this._panel_chart_downloading.datasets[1].data[i] = five_last[i].merging

            let l = []
            for (let i = 0; i < 5; i++) {
                this._panel_chart_bitrates.labels[i] = Math.max(i + 1, this._panel_stats_data.length - 5 + i)
                this._panel_chart_downloading.labels[i] = Math.max(i + 1, this._panel_stats_data.length - 5 + i)
            }

            this._panel_chart_bitrates.chart.update()
            this._panel_chart_downloading.chart.update()

            this._panel_total_downloaded += sum
            this._setData('overview.total', Math.floor(this._panel_total_downloaded / (1000 * 1000)) + ' MB')
        }

        for (let i = 0; i < this._panel_chart_bitrates.datasets.length - 2; i++) {
            let br = this._panel_chart_bitrates.datasets[i].data[this._panel_chart_bitrates.datasets[i].data.length - 1]
            if (!br) break
            this._controls_grid_tiles[i].updateBitrate(br)
        }

    }

    private _setPanel(): void {
        this._setData('infos.videoname', this._content_name)
        this._setData('infos.numbertiles', this._content_grid_size[0] * this._content_grid_size[1] + '')
        this._setData('infos.gridssize', this._content_grid_size[0] + ' x ' + this._content_grid_size[1])
        this._setData('infos.numbersegments', this._content_nb_segments + '')

        this._panel_total_downloaded = 0
        //infos.resolution

        let tabs = document.querySelectorAll('.tabs')
        for (let j = 0; j < tabs.length; j++) {
            let t = tabs[j]
            let contents = t.querySelectorAll('.content')
            let buttons = t.querySelectorAll('.buttons button')
            for (let i = 0; i < buttons.length; i++) {
                let button = buttons[i]
                let val = button.getAttribute('value')

                button.addEventListener('click', e => {
                    for (let u = 0; u < buttons.length; u++) {
                        buttons[u].className = ''
                    }
                    button.className = 'active'
                    for (let u = 0; u < contents.length; u++) {
                        if (contents[u].getAttribute('ref') === val)
                            (<any>contents[u]).style.display = 'block'
                        else
                            (<any>contents[u]).style.display = 'none'
                    }
                })
            }
        }

        let width: any = document.querySelector('input[name="width"]')
        let changeWidth = () => {
            try {
                let v = parseInt(width.value)
                this._controls_view.style.width = Math.min(v, this._controls_grid.clientWidth) + 'px'
            }
            catch (e) { }
        }
        if (width) {
            width.addEventListener('change', changeWidth)
            width.value = this._controls_view.clientWidth
        }

        let height: any = document.querySelector('input[name="height"]')
        let changeHeight = () => {
            try {
                let v = parseInt(height.value)
                this._controls_view.style.height = Math.min(v, this._controls_grid.clientHeight) + 'px'
            }
            catch (e) { }
        }
        if (height) {
            height.addEventListener('change', changeHeight)
            height.value = this._controls_view.clientHeight
        }

        let button_grid = document.querySelector('button[value="grid"]')
        let toogleGrid = () => {
            console.log("clicked")
            if (button_grid.className === 'js-true') {
                this._controls_grid.className = this._controls_grid.className.replace('shown', '')
                button_grid.className = 'js-false'
                button_grid.innerHTML = 'Show'
            }
            else {
                this._controls_grid.className = this._controls_grid.className.split(' ').filter(e => e.trim().length).concat(['shown']).join(' ')
                button_grid.className = 'js-true'
                button_grid.innerHTML = 'Hide'
            }
        }
        if (button_grid) button_grid.addEventListener('click', toogleGrid)

        let button_mode = document.querySelector('button[value="mode"]')
        let toogleMode = () => {
            if (button_mode.className === 'js-buttons') {
                this._controls_grid.className = this._controls_grid.className.replace('buttons', '')
                this._controls_view.className = 'active'
                this._controls_disable_viewport = false
                button_mode.className = 'js-viewport'
                button_mode.innerHTML = "Switch to buttons"
            }
            else {
                this._controls_view.className = ''
                this._controls_grid.className = this._controls_grid.className.split(' ').filter(e => e.trim().length).concat(['buttons']).join(' ')
                this._controls_disable_viewport = true
                button_mode.className = 'js-buttons'
                button_mode.innerHTML = "Switch to viewport"
            }
        }
        if (button_mode)
            button_mode.addEventListener('click', toogleMode)

        if (this._demo_grid) toogleGrid()
        if (this._demo_mode === 'buttons') toogleMode()

        let createChart = type => {
            let labels = [1, 2, 3, 4, 5]
            let datasets = []

            if (type === 'bitrates') {
                for (let i = 0; i <= this._content_grid_size[0] * this._content_grid_size[1] + 1; i++)
                    datasets.push({
                        label: i < this._content_grid_size[0] * this._content_grid_size[1] ? 'Tile ' + i : (i === this._content_grid_size[0] * this._content_grid_size[1] ? 'Base track' : 'Whole Video'),
                        data: [],
                        fill: false
                    })
            }
            else {
                datasets = [{
                    label: 'Downloading Time',
                    data: [],
                    fill: false
                }, {
                    label: 'Mergin Time',
                    data: [],
                    fill: false
                }]
            }

            //console.log(datasets)

            let ctx = (<any>document.getElementById('chart-' + type)).getContext("2d");

            let chart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets,
                    labels
                },
                options: {
                    legend: {
                        display: false
                    },
                    maintainAspectRatio: false,
                    scales: {
                        yAxes: [{
                            ticks: {
                                max: type === 'bitrates' ? this._content_bitrates[this._content_bitrates.length - 1] * 1.1 : 1000,
                                min: 0
                            }
                        }]
                    }
                }
            })

            this["_panel_chart_" + type] = {
                labels, datasets, chart
            }
        }

        createChart('bitrates')
        createChart('downloading')

        this._panel_stats_data = []
    }

    private _setPlayer(): void {
        this._player_current_segment = 'init'
        this._player_source_buffer = undefined
        this._player_media_source = new MediaSource()
        this._player_stored_segment = []
        this._player_video = document.getElementsByTagName('video')[0]
        this._player_last_time = 0
        this._player_container = document.getElementById('container')

        let updateWidth = () => {
            this._player_container.style.width = (this._player_container.clientHeight * this._content_ratio[0] / this._content_ratio[1]) + 'px'
        }
        updateWidth()

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

                            if (this._player_current_segment === 3) {
                                let d = this._player_last_time - old
                                this._panel_stats_data[0].segment_duration = d / 2
                                this._panel_stats_data[1].segment_duration = d / 2
                            }
                            else
                                this._panel_stats_data[(<number>this._player_current_segment) - 2].segment_duration = this._player_last_time - old

                            this._updatePanel()

                            setTimeout(() => {

                                if (!this._playerAppend() && this._demo_reload) {
                                    console.log("Reloading")
                                    // nothing more to append, reload in 5000ms
                                    setTimeout(() => {
                                        location.reload()
                                    }, 3000)
                                }
                            }, Math.max(this._player_video.buffered.end(0) - this._player_video.currentTime - 1.5, 0) * 1000)

                            //let sum = 0
                            //for (let i = 0; i < this._player_tiles_bytes_length.length; i++) {
                            //    sum += this._player_tiles_bytes_length[i]
                            //    if (this._player_tiles_bytes_length.length && this._controls_grid_tiles[i])
                            //        this._controls_grid_tiles[i].updateBitrate(Math.floor(this._player_tiles_bytes_length[i] / delta / 1000))
                            //}
                            //
                            //document.getElementById('current_bitrate').innerHTML = Math.floor(sum / delta / 1000) + ' kB/s'
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

            //console.log(stored_segments)
            for (let i = 0; i < this._content_grid_size[0] * this._content_grid_size[1]; i++)
                if (this._player_stored_segment[segment_number] && this._player_stored_segment[segment_number][i] && this._player_stored_segment[segment_number][i][this._controls_current_matrix[i]])
                    buffers[i] = this._player_stored_segment[segment_number][i][this._controls_current_matrix[i]]
                else
                    promises.push(fetch(scheme.replace(new RegExp('%bitrate%', 'g'), this._content_bitrates[this._controls_current_matrix[i]] + '').replace('%tile%', this._content_video_tracks_numbers[i] + '')).then(r => r.arrayBuffer())
                        .then(arrayBuffer => {
                            stats.bytes[i] = arrayBuffer.byteLength
                            buffers[i] = arrayBuffer
                            //if (!this._player_stored_segment[segment_number]) this._player_stored_segment[segment_number] = []
                            //if (!this._player_stored_segment[segment_number][i]) this._player_stored_segment[segment_number][i] = []
                            //this._player_stored_segment[segment_number][i][this._controls_current_matrix[i]] = arrayBuffer
                        }))

            promises.push(fetch(scheme.replace(new RegExp('%bitrate%', 'g'), this._content_bitrates[0] + '').replace('%tile%', this._content_base_track_number + '')).then(r => r.arrayBuffer())
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
                    this._panel_stats_data[(<any>segment_number) - 1] = stats

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