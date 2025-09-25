class GmeBuilder {
    constructor() {
        this.sounds = [];
        this.scripts = [];
        this.binaries = [];
        this.gmeFileArray = [Buffer.alloc(0x200)];
        this.currenOffset = 0x200;
        this.mediaTableOffset = 0;
    }

    /**
     * 
     * @param {Buffer} chunk 
     * @returns {Number}
     */
    addChunk(chunk) {
        const startOffset = this.currenOffset
        this.currenOffset = this.currenOffset + chunk.length
        this.gmeFileArray.push(chunk)
        return startOffset
    }


    /**
     * 
     * @param {Array} medias 
     */
    addMedias(medias) {
        medias.map((x) => {
            x.offset = this.currenOffset
            x.size = x.buffer.length
            addChunk(x.buffer)
            return x
        })
        // write media table
        this.mediaTableOffset = this.currenOffset // todo: check this
        medias.forEach((x) => {
            const buff = Buffer.alloc(8)
            buff.writeUInt32LE(x.offset, 0)
            buff.writeUint32LE(x.size, 4)
            addChunk(buff)
        })
    }

    /**
     * 
     * @param {Number} productID 
     * @param {Buffer} binaryBuff 
     * @returns {Buffer}
     */
    buildMinimalFile(productID, binaryBuff) {

        const binaryOffset = this.addChunk(binaryBuff)
        
        // create pointer and length for the binary
        const binpoint = Buffer.alloc(8)
        binpoint.writeUInt32LE(binaryOffset, 0)
        binpoint.writeUInt32LE(binaryBuff.length, 4)
        
        const tableLength = Buffer.alloc(16)
        tableLength.writeUInt16LE(1, 0)
        
        // add length and pointer to binarys together
        const binaryTableOffset = this.addChunk(tableLength)
        this.addChunk(binpoint)
        
        const gmeFileBuffer = Buffer.concat(this.gmeFileArray)
        
        // gme file header
        gmeFileBuffer.writeUInt32LE(binaryTableOffset, 0xC8) // genration 3L main
        gmeFileBuffer.writeUInt32LE(0x238b, 0x8) // magic
        gmeFileBuffer.writeUInt32LE(productID, 0x14)
        gmeFileBuffer.writeUInt32LE(1, 0xA4) // enable binaries

        return this.gmeFileBuffer
    }

}

module.exports.GmeBuilder = GmeBuilder