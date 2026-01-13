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

    buildHomebrew(productID, binaryBuff2N, binaryBuff3L) {
        const binaryOffset2N = this.addChunk(binaryBuff2N)
        
        // create pointer and length for the binary
        const binpoint2N = Buffer.alloc(16)
        binpoint2N.write("gmelib2M", 8)
        binpoint2N.writeUInt32LE(binaryOffset2N, 0)
        binpoint2N.writeUInt32LE(binaryBuff2N.length, 4)
        
        const tableLength2N = Buffer.alloc(16)
        tableLength2N.writeUInt16LE(1, 0)
        
        // add length and pointer to binarys together
        const binaryTableOffset2N = this.addChunk(tableLength2N)
        this.addChunk(binpoint2N)


        const binaryOffset3L = this.addChunk(binaryBuff3L)
        
        // create pointer and length for the binary
        const binpoint3L = Buffer.alloc(16)
        binpoint3L.write("gmelib3M", 8)
        binpoint3L.writeUInt32LE(binaryOffset3L, 0)
        binpoint3L.writeUInt32LE(binaryBuff3L.length, 4)
        
        const tableLength3L = Buffer.alloc(16)
        tableLength3L.writeUInt16LE(1, 0)
        
        // add length and pointer to binarys together
        const binaryTableOffset3L = this.addChunk(tableLength3L)
        this.addChunk(binpoint3L)

        const gmeFileBuffer = Buffer.concat(this.gmeFileArray)
        
        // gme file header
        const str = "gmelib minimal with main binaries"
        gmeFileBuffer.writeUInt8(str.length, 0x20)
        gmeFileBuffer.write(str, 0x21)
        gmeFileBuffer.writeUInt32LE(binaryTableOffset2N, 0xA8) 
        gmeFileBuffer.writeUInt32LE(binaryTableOffset3L, 0xC8)
        gmeFileBuffer.writeUInt32LE(0x238b, 0x8) // magic
        gmeFileBuffer.writeUInt32LE(productID, 0x14)
        gmeFileBuffer.writeUInt32LE(1, 0xA4) // enable binaries

        return this.gmeFileBuffer
    }

}

module.exports.GmeBuilder = GmeBuilder