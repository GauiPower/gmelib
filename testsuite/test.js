const gmelib = require('../lib.js')
const fs = require('fs')

console.log(`${fs.readdirSync("./testsuite/input").length} files`)

fs.readdirSync("./testsuite/input").forEach((filename) => {
    const gmefile = new gmelib.GmeFile(fs.readFileSync(`./testsuite/input/${filename}`))
    console.log(gmefile.main1binaryTable)
})
