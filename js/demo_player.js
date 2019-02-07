var PlayerDemonstration = /** @class */ (function () {
    function PlayerDemonstration(content_list_url, index_video, index_grid) {
        this._CONTENT_URL = content_list_url;
        this._index_grid = index_grid;
        this._index_video = index_video;
    }
    PlayerDemonstration.prototype.init = function (logs) {
        var _this = this;
        if (HEVCMerger && Chart) {
            this._player_merger = new HEVCMerger(logs);
            return this._setContent().then(function () {
                _this._setDemo();
                //  this._setControls()
                _this._setPlayer();
            });
        }
        else if (Chart)
            console.error('HEVCMerger is missing');
        else
            console.error('Chart JS is missing');
    };
    PlayerDemonstration.prototype._setContent = function () {
        var _this = this;
        return fetch(this._CONTENT_URL).then(function (d) { return d.json(); }).then(function (json) {
            var options = json.contents[_this._index_video];
            // get all values
            _this._content_grid_size = options.grids[_this._index_grid].split('x').map(function (e) { return parseInt(e); });
            _this._content_url_scheme = options.content_url_scheme;
            _this._content_base_track_number = options.base_track;
            _this._content_video_tracks_numbers = [];
            _this._content_nb_segments = options.nb_segments;
            _this._content_update_dash_init = options.update_dash_init;
            _this._content_dash_init = options.dash_init;
            _this._content_bitrates = options.bitrates;
            _this._content_ratio = options.ratio;
            _this._content_name = options.name;
            // update url shemes
            _this._content_url_scheme = _this._content_url_scheme.replace(new RegExp('%grid%', 'g'), options.grids[_this._index_grid]);
            _this._content_dash_init = _this._content_dash_init.replace(new RegExp('%grid%', 'g'), options.grids[_this._index_grid]).replace(new RegExp('%bitrate%', 'g'), options.bitrates[0]);
            // update tracks numbers
            for (var i = options.base_track + 1 * (options.base_track > 1 ? -1 : 1); options.base_track > 1 && i >= options.base_track - _this._content_grid_size[0] * _this._content_grid_size[1] ||
                options.base_track <= 1 && i <= options.base_track + _this._content_grid_size[0] * _this._content_grid_size[1]; i = i + 1 * (options.base_track > 1 ? -1 : 1))
                _this._content_video_tracks_numbers.push(i);
        });
    };
    PlayerDemonstration.prototype._setDemo = function () {
        var _this = this;
        // for demo, reload the page when # changes
        window.onhashchange = function () { location.reload(); };
        //this._demo_tiles_level = []
        //this._demo_global_level = 0
        this._demo_mode = 'viewport';
        this._demo_view_port = [200, 200];
        this._demo_grid = false;
        this._demo_fading_level = 0;
        this._demo_start = 'highest';
        this._demo_reload = false;
        var hash = window.location.hash;
        hash = !hash ? '' : hash.substr(1);
        if (!hash.length)
            return;
        // get all params
        var demo_opts = hash.split('--');
        demo_opts.forEach(function (o) {
            var p = o.split('=');
            if (p.length !== 2)
                return;
            var name = p[0], value = p[1];
            if (name === 'mode')
                _this._demo_mode = value;
            else if (name === 'start')
                _this._demo_start = value;
            else if (name === 'reload')
                _this._demo_reload = (value == 'true' || value == '1' || value == 'y');
            else if (name === 'profile')
                _this._demo_fading_level = parseInt(value);
            else if (name === 'viewport')
                _this._demo_view_port = value.split('x').map(function (s) { return parseInt(s); });
            else if (name === "grid")
                _this._demo_grid = (value == 'true' || value == '1' || value == 'y');
        });
    };
    PlayerDemonstration.prototype._setData = function (name, value) {
        var e = document.querySelectorAll('[data="' + name + '"]');
        for (var i = 0; i < e.length; i++)
            e[i].innerHTML = value;
    };
    PlayerDemonstration.prototype._setPlayer = function () {
        var _this = this;
        this._player_current_segment = 'init';
        this._player_source_buffer = undefined;
        this._player_media_source = new MediaSource();
        this._player_stored_segment = [];
        this._player_video = document.getElementsByTagName('video')[0];
        this._player_last_time = 0;
        this._player_container = document.getElementById('container');
        this._player_video.src = window.URL.createObjectURL(this._player_media_source);
        this._player_media_source.addEventListener('sourceopen', function (e) {
            _this._player_source_buffer = _this._player_media_source.addSourceBuffer('video/mp4; codecs="hev1.1.6.L186.80"');
            console.log("Source is open");
            _this._player_source_buffer.addEventListener('updateend', function () {
                //console.log(this._player_current_segment)
                if (_this._player_current_segment > 2)
                    setTimeout(function () {
                        try {
                            var old = _this._player_last_time;
                            _this._player_last_time = _this._player_video.buffered.end(0);
                            if (!_this._playerAppend() && _this._demo_reload) {
                                console.log("Reloading");
                                // nothing more to append, reload in 5000ms
                                setTimeout(function () {
                                    location.reload();
                                }, 3000);
                            }
                            /*
                            setTimeout(() => {

                                if (!this._playerAppend() && this._demo_reload) {
                                    console.log("Reloading")
                                    // nothing more to append, reload in 5000ms
                                    setTimeout(() => {
                                        location.reload()
                                    }, 3000)
                                }
                            }, Math.max(this._player_video.buffered.end(0) - this._player_video.currentTime - 1.5, 0) * 1000)*/
                        }
                        catch (e) {
                            console.error(e);
                            _this._playerAppend();
                        }
                    });
                else
                    _this._playerAppend();
            });
            _this._playerAppend();
        }, false);
    };
    PlayerDemonstration.prototype._playerAppend = function () {
        var _this = this;
        if (this._player_current_segment === "init" && (this._player_current_segment = 1)) {
            this._playerLoadInit().then(function (arrayBuffer) { return _this._player_source_buffer.appendBuffer(arrayBuffer); });
            return true;
        }
        else if (this._player_current_segment <= this._content_nb_segments) {
            this._playerLoadSegment().then(function (arrayBuffer) { return _this._player_source_buffer.appendBuffer(arrayBuffer); });
            return true;
        }
        else
            return false;
    };
    PlayerDemonstration.prototype._playerLoadSegment = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var stats = {
                bytes: [],
                download: 0,
                merging: 0,
                segment_duration: 0
            };
            var segment_number = _this._player_current_segment;
            var buffers = [];
            var promises = [];
            var start = Date.now();
            var scheme = _this._content_url_scheme.replace('%segment%', segment_number + '');
            console.log("Grid: " + _this._content_grid_size[0] + "x" + _this._content_grid_size[1]);
            var _loop_1 = function (i) {
                var url_1 = scheme.replace(new RegExp('%bitrate%', 'g'), _this._content_bitrates[0] + '')
                    .replace('%tile%', _this._content_video_tracks_numbers[i] + '');
                console.log("Fetch: " + url_1);
                promises.push(fetch(url_1).then(function (r) { return r.arrayBuffer(); })
                    .then(function (arrayBuffer) {
                    stats.bytes[i] = arrayBuffer.byteLength;
                    buffers[i] = arrayBuffer;
                }));
            };
            //console.log(stored_segments)
            for (var i = 0; i < _this._content_grid_size[0] * _this._content_grid_size[1]; i++) {
                _loop_1(i);
            }
            var url = scheme.replace(new RegExp('%bitrate%', 'g'), _this._content_bitrates[0] + '')
                .replace('%tile%', _this._content_base_track_number + '');
            console.log("Fetch: " + url);
            promises.push(fetch(url).then(function (r) { return r.arrayBuffer(); })
                .then(function (arrayBuffer) {
                stats.bytes[_this._content_grid_size[0] * _this._content_grid_size[1]] = arrayBuffer.byteLength;
                return buffers[_this._content_grid_size[0] * _this._content_grid_size[1]] = arrayBuffer;
            }));
            Promise.all(promises).then(function (r) {
                try {
                    var step = Date.now();
                    stats.download = step - start;
                    //console.log("== content 10 segment files downloaded in " + (step - start) + "ms")
                    // timeout here to feed the buffers var before resolving the promise
                    var merged_content = _this._player_merger.merge(buffers, segment_number);
                    stats.merging = Date.now() - step;
                    //  this._panel_stats_data[(<any>segment_number) - 1] = stats
                    //console.log("== content 10 segment files merged together in " + (Date.now() - step) + "ms")
                    _this._player_current_segment += 1;
                    resolve(merged_content);
                }
                catch (e) {
                    console.error(e);
                }
            });
        });
    };
    PlayerDemonstration.prototype._playerLoadInit = function () {
        var _this = this;
        // load dash init
        if (this._content_update_dash_init)
            return fetch(this._content_dash_init).then(function (r) { return r.arrayBuffer(); }).then(function (arrayBuffer) { return _this._player_merger.update(arrayBuffer); });
        else
            return fetch(this._content_dash_init).then(function (r) { return r.arrayBuffer(); });
    };
    return PlayerDemonstration;
}());
//# sourceMappingURL=demo_player.js.map