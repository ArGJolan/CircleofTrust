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

module.exports = Chromeless
