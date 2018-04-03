const snoowrap = require('snoowrap')
const Mongo = require('./mongo')
const config = require('./config')
const request = require('request-promise')
const Chromeless = require('./browser')


const mongo = new Mongo(config.mongo)

const blackList = []

const wordsBlackList = [
  'FeelsGoodMan'
]

const r = new snoowrap(config.reddit)
const opts = {
  goto: 'https://www.reddit.com/',
  domain: 'www.reddit.com',
  debug: false,
  reset: false,
  chromeless: {
    viewport: { width: 1920, height: 1040, scale: 1 }
  }
}

const chromeless = new Chromeless(opts)

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

test = async function () {
  console.log('Go')
  await auth()
  console.log('Authed')
  await mongo.run()

  while (1) {
    try {
      const comments = await r.getNewComments('CircleofTrust', { limit: 5000 })
      console.log('Processing', comments.length, 'new users')
      for (let id in comments) {
        if (comments[id] && comments[id].author && !blackList.includes(comments[id].author) && (/[A-Z][a-z]+[A-Z][a-z]+[A-Z][a-z]+/.test(comments[id].body))) {
          const words = comments[id].body.replace(/\n/g, ' ').split(' ')
          for (let wid in words) {
            const word = words[wid]
            if (/^[A-Z][a-z]+[A-Z][a-z]+[A-Z][a-z]+$/.test(word) && !wordsBlackList.includes(word)) {
              const user = comments[id].author.name
              const res = await mongo.find('circle', { filter: { user } })
              const res2 = await mongo.find('circle', { filter: { word } })
              if (!res.length && !res2.length) {
                await unlock(user, word)
                mongo.insertOne('circle', { user, word })
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err.message || err)
      if (err.message && err.message.match(/403/)) {
        await sleep(60000)
      } else {
        await sleep(10000)
      }
    }

  }
}

async function auth () {
  await chromeless.setOptions(opts)
    .clearCache()
    .clearCookies()
    .goto(opts.goto)
    .wait(5000)

  await chromeless.click('#header-bottom-right > span.user > a.login-required.login-link')
    .wait(1000)

  await chromeless.type(config.voterReddit.username, '#user_login')
  await chromeless.type(config.voterReddit.password, '#passwd_login')

  await sleep(1000)

  await chromeless.click('#login-form > div.c-clearfix.c-submit-group > button').wait(5000)
  await chromeless.process()
}

async function unlock (user, code) {
  const t1 = Date.now()
  console.log('►\tTrying to join', user)
  await chromeless.goto(`https://www.reddit.com/user/${user}/circle/embed/`).wait(1000)

  try {
    if (await chromeless.exists('#guess_voting_key > input.vote_key')) {
      await chromeless.type(code, '#guess_voting_key > input.vote_key')
    } else {
      throw new Error('Not found')
    }
  } catch (err) {
    const t2 = Date.now()
    console.log('\x1b[31m✖\t\x1b[0mCould not join', user, code, 'after', Math.round((t2 - t1) / 100) / 10 + 's')
    console.error(err.message || err)
  }

  try {
    if (await chromeless.exists('#guess_voting_key > button')) {
      await chromeless.click('#guess_voting_key > button').wait(5000)
    } else {
      throw new Error('Not found')
    }
  } catch (err) {
    const t2 = Date.now()
    console.log('\x1b[31m✖\t\x1b[0mCould not join', user, code, 'after', Math.round((t2 - t1) / 100) / 10 + 's')
    console.error(err.message || err)
  }
  try {
    if (await chromeless.exists('#vote > button.circle-arrow.up')) {
      await chromeless.click('#vote > button.circle-arrow.up').wait(1000)
      const t2 = Date.now()
      console.log('\x1b[32m✓\t\x1b[0mJoined', user, 'after', Math.round((t2 - t1) / 100) / 10 + 's')
    } else {
      throw new Error('Not found')
    }
  } catch (err) {
    const t2 = Date.now()
    console.log('\x1b[31m✖\t\x1b[0mCould not join', user, code, 'after', Math.round((t2 - t1) / 100) / 10 + 's')
    console.error(err.message || err)
  }
}

try {
  test()
} catch (err) {
  console.error(err)
}
