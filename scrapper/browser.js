const { Chromeless } = require('chromeless')
const fs = require('fs')
const path = require('path')

Chromeless.prototype.setOptions = function (options) {
  this.testOptions = options

  return this
}

Chromeless.prototype.process = async function () {
  await this.evaluate(function () {})
}

Chromeless.prototype.screen = async function (fileName) {
  const screenPath = await this.screenshot()
  await new Promise(function (resolve) {
    const readStream = fs.createReadStream(screenPath)
    const writeStream = fs.createWriteStream(path.resolve('./screens/' + fileName + '.png'))
    readStream.pipe(writeStream)
    readStream.on('end', function () {
      fs.unlinkSync(screenPath)
      resolve()
    })
  })
}

module.exports = Chromeless
