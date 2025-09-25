const gmebuilder = require('../gmebuilder.js')
const fs = require('fs')

const eee = new gmebuilder.GmeBuilder()

const productId = 400

eee.buildMinimalFile(productId, fs.readFileSync(process.argv[1]))
fs.writeFileSync("minigen.gme", eee.gmeFileBuffer)