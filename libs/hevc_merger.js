function HEVCMerger(_console) {
    let console = {
        log: _console && _console.log ? _console.log : () => {},
        error: _console && _console.error ? _console.error : () => {},
        warn: _console && _console.warn ? _console.warn : () => {}, 
    }

    /*
        @input:
            - init_segment: ArrayBuffer
            - option: Number, optionnal, 1 = remove tracks
        @output:
            - updated_init_segment: ArrayBuffer
    */
    function updateDashInit(init_segment, option) {
        function delBox(box) {
            let r = new Uint8Array(new ArrayBuffer(box._raw.buffer.byteLength - box._raw.byteLength))

            // remove the box
            r.set(new Uint8Array(box._raw.buffer.slice(0, box._raw.byteOffset)), 0)
            r.set(new Uint8Array(box._raw.buffer.slice(box._raw.byteOffset + box._raw.byteLength)), box._raw.byteOffset)

            // change parent size
            let output = new DataView(r.buffer)
            let parent = box._parent
            do {
                if (!parent.type) continue
                let n_size = output.getUint32(parent._offset) - box.size
                output.setUint32(parent._offset, n_size)
            }
            while (parent = parent._parent)

            return ISOBoxer.parseBuffer(output.buffer)
        }

        function changeNameBox(box, name) {
            // override the name
            for (let i = 0; i < name.length; i++)
                box._raw.setUint8(4 + i, name[i].charCodeAt(0))
            return ISOBoxer.parseBuffer(box._raw.buffer)
        }

        function editBox(box, func, size_diff) {
            // create new buffer and exec function
            let tmp = new Uint8Array(new ArrayBuffer(box.size - 8 + size_diff))
            tmp.set(new Uint8Array(box._raw.buffer.slice(box._raw.byteOffset + 8, box._raw.byteOffset + box._raw.byteLength + size_diff)), 0)
            let n_box = new DataView(tmp.buffer)
            n_box = func(n_box)

            // update all sizes
            box._raw.setUint32(0, box.size + size_diff)
            let parent = box._parent
            do {
                if (!parent.type) continue
                let n_size = parent._raw.getUint32(0) + size_diff
                parent._raw.setUint32(0, n_size)
            }
            while (parent = parent._parent);

            // recreate
            let output = new Uint8Array(new ArrayBuffer(box._raw.buffer.byteLength + size_diff))
            output.set(new Uint8Array(box._raw.buffer.slice(0, box._offset + 8)), 0)
            output.set(new Uint8Array(n_box.buffer), box._offset + 8)
            output.set(new Uint8Array(box._raw.buffer.slice(box._raw.byteOffset + box._raw.byteLength)), box._offset + box.size + size_diff)

            return ISOBoxer.parseBuffer(output.buffer)
        }

        console.log("==== UPDATING INIT SEGMENT ====")
        let parsed = ISOBoxer.parseBuffer(init_segment)
        /* MANDATORY hvc2 should become hvc1 box to be playable! */
        parsed = changeNameBox(parsed.fetch('stsd').entries[0], 'hvc1')

        if (option === 1) {
            parsed = delBox(parsed.fetch('tref'))
            console.log("== option 1, deleting tracks")
            let current
            while ((current = parsed.fetchAll('trex')).length > 1)
                parsed = delBox(current[current.length - 1])
            while ((current = parsed.fetchAll('trak')).length > 1)
                parsed = delBox(current[current.length - 1])
        }

        // @updated_init_segment
        return parsed._raw.buffer
    }

    /*
        @input:
            - segments_buffers: Array<ArrayBuffer>
            - current_segment: Number, Segment number you are merging, required only if strict mode 
            - strict: boolean, update SDIX and MFHD boxes. Working without
        @output:
            - merged_segment: Uint8Array, return the merged content
    */
    function merger(segments_buffers, current_segment, strict = false) {
        console.log("==== MERGING SEGMENT " + current_segment + " ====")
        console.log("== parsing segments")
        let detailed_segments = multipleISOBMFFParser(segments_buffers)

        console.log("== merging video data")
        let output_mdat = HEVCMerger(detailed_segments)

        // get the first ISOBMFF header
        console.log("== creating ISOBMFF header")

        // Note we use the index 1 and not 0 because ISOBMFF Header of index 0 is weird
        let isobox = detailed_segments[1].parsed
        let offset = 0

        // Computing final length
        let mdat = isobox.fetch('mdat')
        let mdat_offset = mdat._offset
        let final_length = mdat_offset + 8 + output_mdat.data.length

        // we need now to update boxes
        // TRUN Box => update samples sizes
        // SIDX, MFHD and TFHD => set track ID = 1, maybe useless
        // MDAT => create box header and put video data

        // TRUN, ref = https://github.com/madebyhiro/codem-isoboxer/blob/master/src/processors/trun.js
        let trun = isobox.fetch('trun')
        let entry_offset = trun._offset + 8 + 4 + 4             // 8 = Box header + 4 full box + 4 = nb entries

        if (trun.flags & 1) entry_offset += 4        // flag 1
        if ((trun.flags & 4) >> 2) entry_offset += 4 // flag 4

        for (let i = 0; i < output_mdat.samples.length; i++) {
            isobox._raw.setUint32(entry_offset, output_mdat.samples[i])
            entry_offset += 4
        }

        console.log("== TRUN box updated")

        if (strict) {
            // SDIX
            let sidx = isobox.fetch('sidx')
            let reference_id_offset = sidx._offset + 8 + 4
            isobox._raw.setUint32(reference_id_offset, 1)

            let reference_offset = sidx._offset + 8 + 4 + 4 + 4 + 4 + 8
            isobox._raw.setUint32(reference_offset, final_length - 68)

            console.log("== SIDX box updated")

            // MFHD
            let mfhd = isobox.fetch('mfhd')
            offset = mfhd._offset + 8 + 4
            isobox._raw.setUint32(offset, current_segment)

            console.log("== MFHD box updated")
        }

        // TFHD
        let tfhd = isobox.fetch('tfhd')
        offset = tfhd._offset + 8 + 4
        isobox._raw.setUint32(offset, 1)

        console.log("== TFHD box updated")

        // MDAT
        // Creating box header: box data length = 8 (header) + data length
        let mdat_header = new DataView(new ArrayBuffer(8))
        mdat_header.setUint32(0, 8 + output_mdat.data.length)
        // Adding box type = mdat
        mdat_header.setUint32(4, 1835295092) // = mdat
        let injectable_mdat_header = new Uint8Array(mdat_header.buffer)

        console.log("== MDAT box updated")

        // Creating the final file
        let output_file = new Uint8Array(final_length)
        output_file.set(injectable_mdat_header, mdat_offset)
        output_file.set(new Uint8Array(isobox._raw.buffer.slice(0, mdat_offset)), 0)
        output_file.set(output_mdat.data, mdat_offset + 8)

        console.log("== merging Process done, U8intArray returned")

        // @merged_segment
        return output_file
    }

    /*
        @input:
            - split_video_data: Array<{ data: Uint8Array, samples: Array<number> }>, plese remove header of video data
        @output:
            - non_split_video_data: { data: Uint8Array, samples: Array<number> }
    */
    function HEVCMerger(split_video_data) {
        // Compute the new size
        split_video_data.forEach(e => {
            console.log(e.samples)
        })
        let length = split_video_data.reduce((sum, current) => { current.offset = 0; return sum + current.samples.reduce((sum, a) => sum + a, 0) }, 0)
        console.log(length)
        let output = { data: new Uint8Array(length), samples: [] }

        let current_sample = 0
        let current_offset = 0
        let nb_samples = split_video_data[0].samples.length

        console.log("== " + nb_samples + " samples")

        for (current_sample = 0; current_sample < nb_samples; current_sample++) {
            output.samples[current_sample] = 0

            for (let i = 0; i < split_video_data.length; i++) {
                let current_tile = split_video_data[i]
                let nb_bytes_to_copy = current_tile.samples[current_sample]
                output.data.set(current_tile.data.slice(current_tile.offset, current_tile.offset += nb_bytes_to_copy), current_offset)
                current_offset += nb_bytes_to_copy
                output.samples[current_sample] += nb_bytes_to_copy
            }
        }

        // @non_split_video_data
        return output
    }

    /*
        @input:
            - segments_buffers: Array<ArrayBuffer>, file data
        @output:
            - detailed_segments: Array<{ parsed: ISOFile, data: ArrayBuffer, samples: Array<number> }>
    */
    function multipleISOBMFFParser(segments_buffers) {
        let output = []

        for (let i = 0; i < segments_buffers.length; i++) {
            let parsedFile = ISOBoxer.parseBuffer(segments_buffers[i])

            // get trun box and mdat box
            let mdat_box = parsedFile.boxes.find(e => e.type === 'mdat')
            let trun_box = parsedFile.boxes.find(e => e.type === 'moof').boxes.find(e => e.type === 'traf').boxes.find(e => e.type === 'trun')
            let samples_sizes = trun_box.samples
            let data = mdat_box.data.buffer.slice(mdat_box.data.byteOffset) // we assume no end because MDAT should be the last box

            let samples = trun_box.samples.map(e => e.sample_size)

            // It seems like the track_1_n.m4s with n > 1 is broken (trun samples are null), patch it here
            if (i === segments_buffers.length - 1 && samples[0] === undefined) {
                let repair_value = mdat_box.data.byteLength / trun_box.samples.length
                samples = samples.map(e => repair_value)
            }
            else if(samples[0] === undefined){
                samples = trun_box.samples.map(e => 0)
            }

            output.push({
                parsed: parsedFile,
                samples,
                data: new Uint8Array(data)
            })
        }

        // @detailed_segments
        return output
    }

    this.merge = merger
    this.update = updateDashInit
}
//module.exports = merger 