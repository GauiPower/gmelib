const fs = require("fs")

class GmeFile {

    /**
     * 
     * @param {String} filename 
     */
    constructor(filename) {
        this.gmeFileBuffer = fs.readFileSync(filename)
        this.playScriptTableOffset = this.gmeFileBuffer.readUInt32LE(0x00)
        this.mediaTableOffset = this.gmeFileBuffer.readUInt32LE(0x04)
        this.gameTableOffset = this.gmeFileBuffer.readUInt32LE(0x10)
        this.productId = this.gmeFileBuffer.readUInt32LE(0x14)
        this.rawXor = this.gmeFileBuffer.readUInt32LE(0x1C)
        this.copyMediaTableOffset = this.gmeFileBuffer.readUInt32LE(0x60)
        
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
     * 
     * @param {Buffer} content 
     * @param {Number} id
     */
    addMediafile(content, id) {
        const encContent = this.crypt(content)
        const mediaOffset = this.gmeFileBuffer.length - 4
        const checksum = this.gmeFileBuffer.slice(this.gmeFileBuffer.length - 4, this.gmeFileBuffer.length) // TODO: public checksum
        const newBufferArr = [this.gmeFileBuffer.slice(0, this.gmeFileBuffer.length - 4), encContent, checksum]
        this.gmeFileBuffer = Buffer.concat(newBufferArr)

        this.mediaSegments[id].offset = mediaOffset
        this.mediaSegments[id].size = encContent.length
        this.mediaSegments[id].relocated = true
    }

    /**
     * 
     * @param {Number} id 
     * @returns 
     */
    extrFile(id) {
        const offset = this.mediaSegments[id].offset
        const size = this.mediaSegments[id].size
        const encContent = this.gmeFileBuffer.slice(offset, offset + size)
        return this.crypt(encContent)
    }

    /**
     * 
     * @param {String} filename 
     */
    saveFile(filename) {
        fs.writeFileSync(filename, this.gmeFileBuffer)
    }

    writeMediaTable() { // after using this, tttool can not longer read this file
        if (this.mediaTableSize !== this.mediaSegments.length * 8) { console.warn("media table has diffrent size") }

        for (let i = 0; this.mediaSegments.length > i; i++) {
            this.gmeFileBuffer.writeUInt32LE(this.mediaSegments[i].offset, this.mediaTableOffset + i * 8)
            this.gmeFileBuffer.writeUInt32LE(this.mediaSegments[i].size, this.mediaTableOffset + i * 8 + 4)
        }

        for (let i = 0; this.mediaSegments.length > i; i++) {
            this.gmeFileBuffer.writeUInt32LE(this.mediaSegments[i].offset, this.mediaTableOffset + this.mediaTableSize + i * 8)
            this.gmeFileBuffer.writeUInt32LE(this.mediaSegments[i].size, this.mediaTableOffset + this.mediaTableSize + i * 8 + 4)
        }
    }

    /**
     * 
     * @param {Buffer} content 
     * @param {Number} id 
     */
    changeSmartMedia(content, id) {
        if (this.mediaSegments[id].size <= content.length) {
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
        this.gmeFileBuffer.writeUInt32LE(id, 0x14)
    }

}

module.exports.GmeFile = GmeFile