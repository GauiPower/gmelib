const gmelib = require('../lib.js')
const fs = require('fs')

const gmefile = new gmelib.GmeFile(fs.readFileSync(process.argv[2]))

console.log(JSON.stringify(gmefile.parseScriptTable(), null, 1))
