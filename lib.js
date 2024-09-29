class GmeFile {

    /**
     * 
     * @param {Buffer} inputBuffer 
     */
    constructor(inputBuffer) {
        this.gmeFileBuffer = inputBuffer
        this.playScriptTableOffset = this.gmeFileBuffer.readUInt32LE(0x00)
        this.mediaTableOffset = this.gmeFileBuffer.readUInt32LE(0x04)
        this.gameTableOffset = this.gmeFileBuffer.readUInt32LE(0x10)
        this.productId = this.gmeFileBuffer.readUInt32LE(0x14)
        this.rawXor = this.gmeFileBuffer.readUInt32LE(0x1C)
        this.copyMediaTableOffset = this.gmeFileBuffer.readUInt32LE(0x60)


        this.game1binariesTableOffset = this.gmeFileBuffer.readUInt32LE(0x90)
        this.game1binariesTable = this.parseBinaryTable(this.game1binariesTableOffset)

        this.game2NbinariesTableOffset = this.gmeFileBuffer.readUInt32LE(0x98)
        this.game2NbinariesTable = this.parseBinaryTable(this.game2NbinariesTableOffset)

        this.main1binaryTableOffset = this.gmeFileBuffer.readUInt32LE(0xA0)
        this.main1binaryTable = this.parseBinaryTable(this.main1binaryTableOffset)

        this.main2NbinaryTableOffset = this.gmeFileBuffer.readUInt32LE(0xA8)
        this.main2NbinaryTable = this.parseBinaryTable(this.main2NbinaryTableOffset)

        this.main3LbinaryTableOffset = this.gmeFileBuffer.readUInt32LE(0xC8)
        this.main3LbinaryTable = this.parseBinaryTable(this.main3LbinaryTableOffset)

        this.game3LbinariesTableOffset = this.gmeFileBuffer.readUInt32LE(0xCC)
        this.game3LbinariesTable = this.parseBinaryTable(this.game3LbinariesTableOffset)


        if (this.copyMediaTableOffset === 0) {
            this.mediaTableSize = this.gmeFileBuffer.readUInt32LE(this.mediaTableOffset) - this.mediaTableOffset
        } else {
            this.mediaTableSize = this.copyMediaTableOffset - this.mediaTableOffset
        }

        this.mediaSegments = [] // parse media table to json
        for (let i = 0; this.mediaTableSize > i; i = i + 8) {
            let json = {}
            json.offset = this.gmeFileBuffer.readUInt32LE(this.mediaTableOffset + i)
            json.size = this.gmeFileBuffer.readUInt32LE(this.mediaTableOffset + i + 4)
            json.number = this.mediaSegments.length
            this.mediaSegments.push(json)
        }

        if (this.gmeFileBuffer[this.mediaSegments[0].offset + 1] === this.gmeFileBuffer[this.mediaSegments[0].offset + 2]) {
            this.xor = "O".charCodeAt() ^ this.gmeFileBuffer[this.mediaSegments[0].offset]
        } else if (this.gmeFileBuffer[this.mediaSegments[0].offset + 2] === this.gmeFileBuffer[this.mediaSegments[0].offset + 3]) {
            this.xor = "R".charCodeAt() ^ this.gmeFileBuffer[this.mediaSegments[0].offset]
        } else {
            console.error("Cant get xor value")
        }
    }

    /**
     * 
     * @param {Number} binaryTableOffset 
     * @returns {Array}
     */
    parseBinaryTable(binaryTableOffset) {
        const array = []
        const bin_count = this.gmeFileBuffer.readUInt32LE(binaryTableOffset)
        for (let i = 0; bin_count > i; i++) {
            const segmentOffset = binaryTableOffset + 16 + i * 16
            const offset = this.gmeFileBuffer.readUInt32LE(segmentOffset)
            const size = this.gmeFileBuffer.readUInt32LE(segmentOffset + 4)
            const filename = this.gmeFileBuffer.slice(segmentOffset + 8, segmentOffset + 16).toString()
            array.push({ offset, size, filename })
        }
        return array
    }

    /**
     * 
     */
    writeBinaryTable(binaryTable, binaryTableOffset) {
        const bin_count = this.gmeFileBuffer.readUInt32LE(binaryTableOffset)
        for (let i = 0; bin_count > i; i++) {
            const segmentOffset = binaryTableOffset + 16 + i * 16
            this.gmeFileBuffer.writeUint32LE(binaryTable[i].offset, segmentOffset)
            this.gmeFileBuffer.writeUint32LE(binaryTable[i].size, segmentOffset + 4)
            const buff = Buffer.from(binaryTable[i].filename)
            buff.copy(this.gmeFileBuffer, segmentOffset + 8, 0, 8)
        }
    }

    /**
     * 
     * @param {Buffer} binaryBuffer 
     * @param {Array} binaryTable 
     * @param {Number} binaryTableOffset 
     * @param {Number} binIndex 
     * @returns {Array}
     */
    replaceBinary(binaryBuffer, binaryTable, binaryTableOffset, binIndex) {
        if (binaryBuffer.length > binaryTable[binIndex].size) {
            binaryTable[binIndex].offset = this.allocateSpace(binaryBuffer)
        } else {
            binaryBuffer.copy(this.gmeFileBuffer, binaryTable[binIndex].offset)
        }
        binaryTable[binIndex].size = binaryBuffer.length
        this.writeBinaryTable(binaryTable, binaryTableOffset)
        return binaryTable
    }


    /**
     * 
     * @param {Buffer} input 
     * @returns {Buffer}
     */
    crypt(input) {
        const invKey = this.xor ^ 0xFF
        return input.map((x) => {
            if (x === 0x00 || x === 0xff || x === this.xor || x === invKey) {
                return x
            } else {
                return x ^ this.xor
            }
        })
    }

    /**
     * 
     * @param {Buffer} content 
     * @param {Number} id 
     */
    raplaceMediaFile(content, id) {
        // if (id !== this.mediaSegments[id].number) {
        //     console.error(`mediaSegments seems corrupted; id: ${id}; mediaSegments[id].number: ${this.mediaSegments[id].number}`)
        //     process.exit(1)
        // }

        const encContent = this.crypt(content)
        const offset = this.mediaSegments[id].offset
        const size = this.mediaSegments[id].size

        if (encContent.length > size) {
            console.warn(`Warning: File with id ${id} is too large, it will be cut off.`)
        }

        encContent.copy(this.gmeFileBuffer, offset, 0, offset + size)
    }

    /**
     * @param {Buffer} buff
     * @returns {number} offset
     */
    allocateSpace(buff) {
        const offset = this.gmeFileBuffer.length - 4
        const checksum = this.gmeFileBuffer.slice(this.gmeFileBuffer.length - 4, this.gmeFileBuffer.length) // TODO: public checksum
        const newBufferArr = [this.gmeFileBuffer.slice(0, this.gmeFileBuffer.length - 4), buff, checksum]
        this.gmeFileBuffer = Buffer.concat(newBufferArr)
        return offset
    }

    /**
     * 
     * @param {Buffer} content 
     * @param {Number} id
     */
    addMediafile(content, id) {
        const encContent = this.crypt(content)
        const mediaOffset = this.allocateSpace(encContent)

        this.mediaSegments[id].offset = mediaOffset
        this.mediaSegments[id].size = encContent.length
        this.mediaSegments[id].relocated = true
    }

    /**
     * 
     * @param {Number} id 
     * @returns {Buffer}
     */
    extractAudioFile(id) {
        const offset = this.mediaSegments[id].offset
        const size = this.mediaSegments[id].size
        const encContent = this.gmeFileBuffer.slice(offset, offset + size)
        return this.crypt(encContent)
    }

    writeMediaTable() { // after using this, tttool can not longer read this file
        if (this.mediaTableSize !== this.mediaSegments.length * 8) { console.warn("media table has diffrent size") }

        for (let i = 0; this.mediaSegments.length > i; i++) {
            this.gmeFileBuffer.writeUInt32LE(this.mediaSegments[i].offset, this.mediaTableOffset + i * 8)
            this.gmeFileBuffer.writeUInt32LE(this.mediaSegments[i].size, this.mediaTableOffset + i * 8 + 4)
        }

        for (let i = 0; this.mediaSegments.length > i; i++) {
            this.gmeFileBuffer.writeUInt32LE(this.mediaSegments[i].offset, this.copyMediaTableOffset + i * 8)
            this.gmeFileBuffer.writeUInt32LE(this.mediaSegments[i].size, this.copyMediaTableOffset + i * 8 + 4)
        }
    }

    /**
     * 
     * @param {Buffer} content 
     * @param {Number} id 
     */
    changeSmartMedia(content, id) {
        if (this.mediaSegments[id].size >= content.length) {
            this.raplaceMediaFile(content, id)
        } else {
            this.addMediafile(content, id)
        }
    }

    /**
     * 
     * @param {Number} id 
     */
    changeProductId(id) {
        this.productId = id
        this.gmeFileBuffer.writeUInt32LE(id, 0x14)
    }

}

module.exports.GmeFile = GmeFile