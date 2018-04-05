const config = require('./config')
const Chromeless = require('../browser')

const opts = {
  goto: 'https://www.reddit.com/login',
  domain: 'www.reddit.com',
  debug: false,
  reset: false,
  chromeless: {
    viewport: { width: 800, height: 600, scale: 1 }
  }
}

const chromeless = new Chromeless(opts)

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function auth () {
  await chromeless.setOptions(opts)
    .clearCache()
    .clearCookies()
    .goto(opts.goto)
    .wait(1000)

  await chromeless.type(config.redditVoter.username, '#user_login')
  await chromeless.type(config.redditVoter.password, '#passwd_login')

  await sleep(1000)

  await chromeless.click('#login-form > div.c-clearfix.c-submit-group > button').wait(5000)
  await chromeless.process()
}

auth().catch(err => {
  console.error(err)
})
