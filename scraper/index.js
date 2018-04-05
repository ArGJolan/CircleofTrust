const snoowrap = require('snoowrap')
const Mongo = require('../mongo')
const config = require('./config')
const Chromeless = require('../browser')

const mongo = new Mongo(config.mongo)

const fetcher = new snoowrap(config.redditFetcher)
const voter = new snoowrap(config.redditVoter)
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

function verboseLog () {
  if (config.verbose) {
    let message = ''
    for (let aid in arguments) {
      const arg = arguments[aid]
      if (arg) {
        message += (message.length !== 0 ? ' ' : '')
        message += arg ? arg : ''
      }
    }
    console.log(message)
    // console.log.call(arguments) TODO: fix that
  }
}

function getPasswords (string) {
  const results = []

  config.stringRules.forEach(rule => {
    const result = string.match(rule.rule)
    if (result && result[rule.pos] && !results.includes(result[rule.pos])) {
      results.push(result[rule.pos])
      const c = (result[rule.pos])[result[rule.pos].length]
      if (['.', '!', '?'].includes(c)) {
        results.push(result[rule.pos].slice(0, -1))
      }
    }
  })

  const words = string.replace(/\n/g, ' ').split(' ')
  if (words.length === 1) {
    return [string]
  }

  words.forEach(word => {
    config.wordRules.forEach(rule => {
      if (word.match(rule) && !results.includes(word) && !config.wordBlacklist.includes(word)) {
        results.push(word)
        const c = (word)[word.length]
        if (['.', '!', '?'].includes(c)) {
          results.push(word.slice(0, -1))
        }
      }
    })
  })

  return results
}

async function isVisible (selector) {
  try {
    await chromeless.evaluate(function (selector) {
      const elem = document.querySelector(selector).attributes
      if (elem.class && elem.class.value && elem.class.value.match(/hidden/)) {
        throw new Error('"' + selector + '" not found')
      }
    }, selector)
    return true
  } catch (err) {
    return false
  }
}

async function unlock (user, code) { /// Probably way to many checks
  await chromeless.goto(`https://www.reddit.com/user/${user}/circle/embed/`).wait(1000)

  const hasError = await chromeless.exists('#classy-error')
  if (hasError) {
    verboseLog('\x1b[34m-\t\x1b[0m' + user, 'doesn\'t have a circle')
    return false
  }

  const stillAlive = await chromeless.exists('#betrayed.hidden')
  if (!stillAlive) {
    verboseLog('\x1b[31m-\t\x1b[0m', user + '\'s circle has been betrayed')
    return false
  }

  const notJoined = await chromeless.exists('#copy-password.hidden')
  if (!notJoined) {
    verboseLog('\x1b[34m-\t\x1b[0mAlready in', user + '\'s circle')
    return false
  }

  try {
    const visible = await isVisible('#guess-password')
    const exists = await chromeless.exists('#guess_voting_key > input.vote_key')
    if (exists && visible) {
      await chromeless.type(code, '#guess_voting_key > input.vote_key')
    }
  } catch (err) {
    console.error(err.message || err)
  }

  try {
    if (await chromeless.exists('#guess_voting_key > button') && await isVisible('#guess-password')) {
      await chromeless.click('#guess_voting_key > button').wait(1000)
    }
  } catch (err) {
    console.error(err.message || err)
  }

  try {
    if (await chromeless.exists('#vote > button.circle-arrow.up')) {
      await chromeless.click('#vote > button.circle-arrow.up').wait(1000)
      await chromeless.process()
    }
  } catch (err) {
    console.error(err.message || err)
  }

  try {
    const form = await chromeless.exists('#guess-password.hide-animated')
    const form2 = await chromeless.exists('#guess-password.hiden')
    const joinBetray = await chromeless.exists('#vote-container.hidden')
    if (!form && !form2) {
      verboseLog('\x1b[31m✖\t\x1b[0mCould not join', user, 'with code', code)
      return false
    }
    if (!joinBetray) {
      console.log('\x1b[45m►►►►\tSomething is wrong with', user, '\x1b[0m')
      return false
    }
    verboseLog('\x1b[42m✔\tJoined', user, 'with code', code, '\x1b[0m')
    return true
  } catch (err) {
    verboseLog('\x1b[31m✖\t\x1b[0mCould not join', user, 'with code', code)
    return false
  }
}

async function scrap () {
  await mongo.run()

  while (1) {
    let count = 0
    try {
      const newComments = await fetcher.getNewComments('CircleofTrust', { limit: 100 })
      const inboxMessages = await voter.getInbox()
      const comments = [...newComments, ...inboxMessages]

      for (let id in comments) {
        const comment = comments[id]
        const text = comment.body
        const user = comment.author.name || comment.author // TODO: fix author === undefined ??
        const passwords = getPasswords(text)
        if (passwords.length && !config.userBlacklist.includes(user)) {
          let displayed = false
          for (let passId in passwords) {
            const word = passwords[passId]
            const res = await mongo.find(config.mongo.trialsCollection, { filter: { user, word } })
            if (!res.length) {
              if (!displayed) {
                verboseLog('►\tTrying to join', user, passwords.length, 'passwords found', '(' + (+id + 1) + '/' + comments.length + ')')
                displayed = true
              }
              const result = await unlock(user, word)
              await mongo.insertOne(config.mongo.trialsCollection, { user, word })
                if (result) {
                await mongo.insertOne(config.mongo.accountsCollection, { user, word })
              }
            }
          }
          count += passwords.length
        }
      }
      if (!count) {
        verboseLog('No key found, waiting for a bit')
        await sleep(10000)
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

scrap().catch(err => {
  console.error(err)
})
