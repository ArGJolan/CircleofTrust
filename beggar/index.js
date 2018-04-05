const config = require('./config')
const Chromeless = require('../browser')

const opts = {
  goto: 'https://www.reddit.com/',
  domain: 'www.reddit.com',
  debug: false,
  reset: false,
  chromeless: {
    viewport: { width: config.chromeless.width, height: config.chromeless.height, scale: 1 }
  }
}

const chromeless = new Chromeless(opts)

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function beg () {
  while (1) {
    try {
      await chromeless.goto('https://www.reddit.com/r/CircleofTrust/new/').wait(1000).process()
      if (await chromeless.exists('div.entry.unvoted > div.top-matter > p.title > a')) {
        await chromeless.click('div.entry.unvoted > div.top-matter > p.title > a').wait(1000).process()
        if (await chromeless.exists('div.md > textarea')) {
          await chromeless.type(config.phrases[1], 'div.md > textarea').wait(1000).process() // TODO: randomize phrases ??

          if (await chromeless.exists('div.bottom-area > div > button.save')) {
            await chromeless.click('div.bottom-area > div > button.save').wait(5000).process()
            await sleep(5000)
          } else {
            throw new Error('Could not find send button')
          }
        } else {
          throw new Error('Could not find comment input')
        }
      } else {
        throw new Error('Could not find post from list')
      }
    } catch (err) {
      console.error(err.message || err)
      await sleep(30000)
    }
  }
}


beg().catch(err => {
  console.error(err)
})
