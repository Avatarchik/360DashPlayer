var PlayerDemonstration = (function () {
    function PlayerDemonstration(content_list_url, index_video, index_grid) {
        this._controls_disable_viewport = false;
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
                _this._setControls();
                _this._setPanel();
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
    PlayerDemonstration.prototype._setControls = function () {
        var _this = this;
        // set all player vars
        this._controls_current_matrix = (function () { var r = []; for (var i = 0; i < _this._content_grid_size[0] * _this._content_grid_size[1]; i++) {
            r.push(_this._demo_start === 'highest' ? _this._content_bitrates.length - 1 : 0);
        } return r; })();
        this._controls_grid = document.getElementById('grid');
        this._controls_grid_tiles = [];
        this._controls_container = document.getElementById('container');
        this._controls_view = document.getElementById('view');
        // set grid if needed
        //let buttons = this._demo_mode === 'buttons'
        //if (this._demo_grid) this._controls_grid.className += this._controls_grid.className ? ' shown' : 'shown'
        var buttons_html = "\n                        <div class=\"controls\">\n                            <div class=\"plus\"><span>+</span></div>\n                            <div class=\"minus\"><span>-</span></div>\n                        </div>";
        var html = "", noBottom = false, noRight = false;
        for (var x = 0; x < this._content_grid_size[0]; x++) {
            noBottom = x === this._content_grid_size[0] - 1;
            for (var y = 0; y < this._content_grid_size[1]; y++)
                html += "\n                            <div style=\"width:" + 100 / this._content_grid_size[1] + "%; height:" + 100 / this._content_grid_size[0] + "%; float:left;\" ref=\"" + (x * this._content_grid_size[1] + y) + "\" class=\"feedback " + (noBottom ? 'no-bottom ' : '') + (y === this._content_grid_size[1] - 1 ? 'no-right ' : '') + "\">\n                                <h2>Tile " + (x * this._content_grid_size[1] + y + 1) + "</h2>\n                                <p class=\"level\"></p>\n                                <p class=\"bitrate\"></p>\n                                " + buttons_html + "\n                            </div>";
            html += "<div style=\"clear:both;\"></div>";
        }
        this._controls_grid.innerHTML = html;
        var tiles = this._controls_grid.querySelectorAll('[ref]');
        var _loop_1 = function (i) {
            var tile = tiles[i];
            var bitrate = tile.querySelector('.bitrate');
            var level = tile.querySelector('.level');
            var tile_object = {
                tile: tile,
                updateBitrate: function (b) { return bitrate.innerHTML = b + " kb/s"; },
                updateLevel: function () { return level.innerHTML = 'Quality ' + _this._controls_current_matrix[i]; }
            };
            this_1._controls_grid_tiles.push(tile_object);
            tile_object.updateLevel();
            var ref = tile.getAttribute('ref');
            tile.querySelector('.plus').addEventListener('click', function (e) {
                _this._controls_current_matrix[parseInt(ref)] = Math.min(_this._content_bitrates.length - 1, _this._controls_current_matrix[parseInt(ref)] + 1);
                tile_object.updateLevel();
            });
            tile.querySelector('.minus').addEventListener('click', function (e) {
                _this._controls_current_matrix[parseInt(ref)] = Math.max(0, _this._controls_current_matrix[parseInt(ref)] - 1);
                tile_object.updateLevel();
            });
        };
        var this_1 = this;
        for (var i = 0; i < tiles.length; i++) {
            _loop_1(i);
        }
        // set the viewport if needed
        this._controls_view.style.width = this._demo_view_port[0] + 'px';
        this._controls_view.style.height = this._demo_view_port[1] + 'px';
        var last_move = 0;
        var delta = 50;
        this._controls_container.addEventListener('mousemove', function (e) {
            if (_this._demo_mode.indexOf('viewport') === -1 || _this._controls_disable_viewport)
                return;
            var d = Date.now();
            var view_size = [_this._controls_view.clientWidth, _this._controls_view.clientHeight];
            var container_size = [_this._controls_container.clientWidth, _this._controls_container.clientHeight];
            //console.log(e)
            var pointer = [e.clientX - _this._controls_container.offsetLeft - view_size[0] / 2, e.clientY - _this._controls_container.offsetTop - view_size[1] / 2];
            //console.log(pointer)
            var left = Math.min(container_size[0] - view_size[0], Math.max(0, pointer[0]));
            var top = Math.min(container_size[1] - view_size[1], Math.max(0, pointer[1]));
            _this._controls_view.style.left = left + 'px';
            _this._controls_view.style.top = top + 'px';
            if (d - last_move < delta)
                return;
            last_move = d;
            var right = left + view_size[0];
            var bottom = top + view_size[1];
            // we have to check the position of each angles
            var corners = [[left, top], [right, top], [left, bottom], [right, bottom]];
            var tiles = [];
            for (var i = 0; i < 4; i++) {
                var tile = Math.floor(corners[i][0] * _this._content_grid_size[1] / container_size[0]) + Math.floor(corners[i][1] * _this._content_grid_size[0] / container_size[1]) * _this._content_grid_size[1];
                if (!i || tiles.indexOf(tile) === -1)
                    tiles.push(tile);
            }
            //console.log(tiles)
            if (tiles.length === 2 && (tiles[0] + 1 < tiles[1] % _this._content_grid_size[1] || tiles[0] + _this._content_grid_size[1] < tiles[1]) || tiles.length === 4) {
                var n = [];
                for (var i = Math.floor(tiles[0] / _this._content_grid_size[1]); i <= Math.floor(tiles[2] / _this._content_grid_size[1]); i++)
                    for (var j = tiles[0] % _this._content_grid_size[1]; j <= tiles[3] % _this._content_grid_size[1]; j++)
                        n.push(i * _this._content_grid_size[1] + j);
                tiles = n;
            }
            // update matrix
            for (var i = 0; i < _this._controls_current_matrix.length; i++) {
                // change here for view port modes (fade or strict)
                var v = tiles.indexOf(i) !== -1 ? _this._content_bitrates.length - 1 : 0;
                _this._controls_current_matrix[i] = v;
            }
            if (_this._demo_fading_level)
                for (var x = 0; x < _this._content_grid_size[1]; x++) {
                    for (var y = 0; y < _this._content_grid_size[0]; y++) {
                        var i = x + y * _this._content_grid_size[0];
                        var v = _this._controls_current_matrix[i];
                        if (v === 0)
                            continue;
                        if (x > 0)
                            _this._controls_current_matrix[x - 1 + y * _this._content_grid_size[0]] = Math.max(_this._controls_current_matrix[x - 1 + y * _this._content_grid_size[0]], v - 1);
                        if (x < _this._content_grid_size[1] - 1)
                            _this._controls_current_matrix[x + 1 + y * _this._content_grid_size[0]] = Math.max(_this._controls_current_matrix[x + 1 + y * _this._content_grid_size[0]], v - 1);
                        if (y > 0)
                            _this._controls_current_matrix[x + (y - 1) * _this._content_grid_size[0]] = Math.max(_this._controls_current_matrix[x + (y - 1) * _this._content_grid_size[0]], v - 1);
                        if (y < _this._content_grid_size[0] - 1)
                            _this._controls_current_matrix[x + (y + 1) * _this._content_grid_size[0]] = Math.max(_this._controls_current_matrix[x + (y + 1) * _this._content_grid_size[0]], v - 1);
                    }
                }
            for (var i = 0; i < _this._controls_current_matrix.length; i++) {
                _this._controls_grid_tiles[i].updateLevel();
            }
        });
    };
    PlayerDemonstration.prototype._setData = function (name, value) {
        var e = document.querySelectorAll('[data="' + name + '"]');
        for (var i = 0; i < e.length; i++)
            e[i].innerHTML = value;
    };
    PlayerDemonstration.prototype._updatePanel = function () {
        var five_last = this._panel_stats_data.slice(Math.max(0, this._panel_stats_data.length - 5));
        for (var i = 0; i < five_last.length; i++) {
            if (!five_last[i])
                continue;
            var sum = 0;
            var duration = five_last[i].segment_duration;
            for (var j = 0; j < five_last[i].bytes.length; j++) {
                sum += five_last[i].bytes[j];
                this._panel_chart_bitrates.datasets[j].data[i] = Math.floor(five_last[i].bytes[j] * 8 / (1000 * duration));
            }
            this._panel_chart_bitrates.datasets[five_last[i].bytes.length].data[i] = Math.floor(sum * 8 / (1000 * duration));
            this._setData('overview.bitrate', Math.floor(sum * 8 / (1000 * 1000 * duration)) + ' Mb/s');
            this._panel_chart_downloading.datasets[0].data[i] = five_last[i].download;
            this._panel_chart_downloading.datasets[1].data[i] = five_last[i].merging;
            var l = [];
            for (var i_1 = 0; i_1 < 5; i_1++) {
                this._panel_chart_bitrates.labels[i_1] = Math.max(i_1 + 1, this._panel_stats_data.length - 5 + i_1);
                this._panel_chart_downloading.labels[i_1] = Math.max(i_1 + 1, this._panel_stats_data.length - 5 + i_1);
            }
            this._panel_chart_bitrates.chart.update();
            this._panel_chart_downloading.chart.update();
            this._panel_total_downloaded += sum;
            this._setData('overview.total', Math.floor(this._panel_total_downloaded / (1000 * 1000)) + ' MB');
        }
        for (var i = 0; i < this._panel_chart_bitrates.datasets.length - 2; i++) {
            var br = this._panel_chart_bitrates.datasets[i].data[this._panel_chart_bitrates.datasets[i].data.length - 1];
            if (!br)
                break;
            this._controls_grid_tiles[i].updateBitrate(br);
        }
    };
    PlayerDemonstration.prototype._setPanel = function () {
        var _this = this;
        this._setData('infos.videoname', this._content_name);
        this._setData('infos.numbertiles', this._content_grid_size[0] * this._content_grid_size[1] + '');
        this._setData('infos.gridssize', this._content_grid_size[0] + ' x ' + this._content_grid_size[1]);
        this._setData('infos.numbersegments', this._content_nb_segments + '');
        this._panel_total_downloaded = 0;
        //infos.resolution
        var tabs = document.querySelectorAll('.tabs');
        var _loop_2 = function (j) {
            var t = tabs[j];
            var contents = t.querySelectorAll('.content');
            var buttons = t.querySelectorAll('.buttons button');
            var _loop_3 = function (i) {
                var button = buttons[i];
                var val = button.getAttribute('value');
                button.addEventListener('click', function (e) {
                    for (var u = 0; u < buttons.length; u++) {
                        buttons[u].className = '';
                    }
                    button.className = 'active';
                    for (var u = 0; u < contents.length; u++) {
                        if (contents[u].getAttribute('ref') === val)
                            contents[u].style.display = 'block';
                        else
                            contents[u].style.display = 'none';
                    }
                });
            };
            for (var i = 0; i < buttons.length; i++) {
                _loop_3(i);
            }
        };
        for (var j = 0; j < tabs.length; j++) {
            _loop_2(j);
        }
        var width = document.querySelector('input[name="width"]');
        var changeWidth = function () {
            try {
                var v = parseInt(width.value);
                _this._controls_view.style.width = Math.min(v, _this._controls_grid.clientWidth) + 'px';
            }
            catch (e) { }
        };
        if (width) {
            width.addEventListener('change', changeWidth);
            width.value = this._controls_view.clientWidth;
        }
        var height = document.querySelector('input[name="height"]');
        var changeHeight = function () {
            try {
                var v = parseInt(height.value);
                _this._controls_view.style.height = Math.min(v, _this._controls_grid.clientHeight) + 'px';
            }
            catch (e) { }
        };
        if (height) {
            height.addEventListener('change', changeHeight);
            height.value = this._controls_view.clientHeight;
        }
        var button_grid = document.querySelector('button[value="grid"]');
        var toogleGrid = function () {
            console.log("clicked");
            if (button_grid.className === 'js-true') {
                _this._controls_grid.className = _this._controls_grid.className.replace('shown', '');
                button_grid.className = 'js-false';
                button_grid.innerHTML = 'Show';
            }
            else {
                _this._controls_grid.className = _this._controls_grid.className.split(' ').filter(function (e) { return e.trim().length; }).concat(['shown']).join(' ');
                button_grid.className = 'js-true';
                button_grid.innerHTML = 'Hide';
            }
        };
        if (button_grid)
            button_grid.addEventListener('click', toogleGrid);
        var button_mode = document.querySelector('button[value="mode"]');
        var toogleMode = function () {
            if (button_mode.className === 'js-buttons') {
                _this._controls_grid.className = _this._controls_grid.className.replace('buttons', '');
                _this._controls_view.className = 'active';
                _this._controls_disable_viewport = false;
                button_mode.className = 'js-viewport';
                button_mode.innerHTML = "Switch to buttons";
            }
            else {
                _this._controls_view.className = '';
                _this._controls_grid.className = _this._controls_grid.className.split(' ').filter(function (e) { return e.trim().length; }).concat(['buttons']).join(' ');
                _this._controls_disable_viewport = true;
                button_mode.className = 'js-buttons';
                button_mode.innerHTML = "Switch to viewport";
            }
        };
        if (button_mode)
            button_mode.addEventListener('click', toogleMode);
        if (this._demo_grid)
            toogleGrid();
        if (this._demo_mode === 'buttons')
            toogleMode();
        var createChart = function (type) {
            var labels = [1, 2, 3, 4, 5];
            var datasets = [];
            if (type === 'bitrates') {
                for (var i = 0; i <= _this._content_grid_size[0] * _this._content_grid_size[1] + 1; i++)
                    datasets.push({
                        label: i < _this._content_grid_size[0] * _this._content_grid_size[1] ? 'Tile ' + i : (i === _this._content_grid_size[0] * _this._content_grid_size[1] ? 'Base track' : 'Whole Video'),
                        data: [],
                        fill: false
                    });
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
                    }];
            }
            //console.log(datasets)
            var ctx = document.getElementById('chart-' + type).getContext("2d");
            var chart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: datasets,
                    labels: labels
                },
                options: {
                    legend: {
                        display: false
                    },
                    maintainAspectRatio: false,
                    scales: {
                        yAxes: [{
                                ticks: {
                                    max: type === 'bitrates' ? _this._content_bitrates[_this._content_bitrates.length - 1] * 1.1 : 1000,
                                    min: 0
                                }
                            }]
                    }
                }
            });
            _this["_panel_chart_" + type] = {
                labels: labels, datasets: datasets, chart: chart
            };
        };
        createChart('bitrates');
        createChart('downloading');
        this._panel_stats_data = [];
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
        var updateWidth = function () {
            _this._player_container.style.width = (_this._player_container.clientHeight * _this._content_ratio[0] / _this._content_ratio[1]) + 'px';
        };
        updateWidth();
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
                            if (_this._player_current_segment === 3) {
                                var d = _this._player_last_time - old;
                                _this._panel_stats_data[0].segment_duration = d / 2;
                                _this._panel_stats_data[1].segment_duration = d / 2;
                            }
                            else
                                _this._panel_stats_data[_this._player_current_segment - 2].segment_duration = _this._player_last_time - old;
                            _this._updatePanel();
                            setTimeout(function () {
                                if (!_this._playerAppend() && _this._demo_reload) {
                                    console.log("Reloading");
                                    // nothing more to append, reload in 5000ms
                                    setTimeout(function () {
                                        location.reload();
                                    }, 3000);
                                }
                            }, Math.max(_this._player_video.buffered.end(0) - _this._player_video.currentTime - 1.5, 0) * 1000);
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
            var _loop_4 = function (i) {
                if (_this._player_stored_segment[segment_number] && _this._player_stored_segment[segment_number][i] && _this._player_stored_segment[segment_number][i][_this._controls_current_matrix[i]])
                    buffers[i] = _this._player_stored_segment[segment_number][i][_this._controls_current_matrix[i]];
                else
                    promises.push(fetch(scheme.replace(new RegExp('%bitrate%', 'g'), _this._content_bitrates[_this._controls_current_matrix[i]] + '').replace('%tile%', _this._content_video_tracks_numbers[i] + '')).then(function (r) { return r.arrayBuffer(); })
                        .then(function (arrayBuffer) {
                        stats.bytes[i] = arrayBuffer.byteLength;
                        buffers[i] = arrayBuffer;
                        //if (!this._player_stored_segment[segment_number]) this._player_stored_segment[segment_number] = []
                        //if (!this._player_stored_segment[segment_number][i]) this._player_stored_segment[segment_number][i] = []
                        //this._player_stored_segment[segment_number][i][this._controls_current_matrix[i]] = arrayBuffer
                    }));
            };
            //console.log(stored_segments)
            for (var i = 0; i < _this._content_grid_size[0] * _this._content_grid_size[1]; i++) {
                _loop_4(i);
            }
            promises.push(fetch(scheme.replace(new RegExp('%bitrate%', 'g'), _this._content_bitrates[0] + '').replace('%tile%', _this._content_base_track_number + '')).then(function (r) { return r.arrayBuffer(); })
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
                    _this._panel_stats_data[segment_number - 1] = stats;
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