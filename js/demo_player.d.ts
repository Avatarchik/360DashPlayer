declare let HEVCMerger: any;
declare let Chart: any;
declare class PlayerDemonstration {
    private _CONTENT_URL;
    private _index_video;
    private _index_grid;
    private finish;
    private _content_name;
    private _content_grid_size;
    private _content_url_scheme;
    private _content_base_track_number;
    private _content_video_tracks_numbers;
    private _content_nb_segments;
    private _content_update_dash_init;
    private _content_dash_init;
    private _content_bitrates;
    private _content_ratio;
    private _demo_view_port;
    private _demo_start;
    private _demo_fading_level;
    private _demo_grid;
    private _demo_mode;
    private _demo_reload;
    private _controls_current_matrix;
    private _player_current_segment;
    private _player_stored_segment;
    private _player_source_buffer;
    private _player_media_source;
    private _player_video;
    private _player_last_time;
    private _player_tiles_bytes_length;
    private _player_merger;
    private _player_container;
    private actualTile;
    private cameraRotationTextView;
    private tilesMap;
    constructor(content_list_url: any, index_video: any, index_grid: any);
    init(logs?: boolean): Promise<any>;
    /**
   * Create tiles map to identify the visible tile.
   *
   * @param colTiles - tile count in x direction
   * @param rowTiles - tile count in y direction
   */
    private createTilesMap(colTiles, rowTiles);
    private _setContent();
    private _setDemo();
    private _setData(name, value);
    private _setPlayer();
    private _playerAppend();
    private _playerLoadSegment();
    private _playerLoadInit();
}
