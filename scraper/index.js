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
      const c = (result[rule.pos])[result[rule.pos].length - 1]
      if (['.', '!', '?', ',', ':'].includes(c)) {
        results.push(result[rule.pos].slice(0, -1))
      }
    }
  })

  const words = string.replace(/\n/g, ' ').split(' ')
  if (words.length === 1) {
    results.push(string)
    const c = (string)[string.length - 1]
    if (['.', '!', '?', ',', ':'].includes(c)) {
      results.push(string.slice(0, -1))
    }
    return results
  }

  words.forEach(word => {
    config.wordRules.forEach(rule => {
      if (word.match(rule) && !results.includes(word) && !config.wordBlacklist.includes(word)) {
        results.push(word)
        const c = (word)[word.length - 1]
        if (['.', '!', '?', ',', ':'].includes(c)) {
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
    verboseLog('\x1b[31m-\t\x1b[0m' + user + '\'s circle has been betrayed')
    return undefined
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

async function scrapFromComments (comments, extraVerbose) {
  let count = 0
  let lastProgress = -1
  for (let id in comments) {
    if (extraVerbose) {
      const currentProgress = Math.round(100 * id / comments.length)
      if (lastProgress !== currentProgress) {
        verboseLog('\x1b[36m↻\t\x1b[0m', currentProgress + '%')
        lastProgress = currentProgress
      }
    }
    const comment = comments[id]
    const text = comment.body || comment.text
    const user = comment.author ? comment.author.name || comment.author : comment.user
    const parent_id = comment.parent_id
    const name = comment.name
    const comment_id = comment.id
    const link_id = comment.link_id
    try {
      const dbMsg = await mongo.find(config.mongo.messagesCollection, { filter: { text, user }})
      if (!dbMsg.length && !config.userBlacklist.includes(user)) {
        await mongo.insertOne(config.mongo.messagesCollection, { text, user, parent_id, name, comment_id, link_id })
      }
    } catch (err) {
      console.error(err)
    }
    const passwords = getPasswords(text)
    if (passwords.length && !config.userBlacklist.includes(user)) {
      let displayed = false
      for (let passId in passwords) {
        const word = passwords[passId]
        const res = await mongo.find(config.mongo.trialsCollection, { filter: { user, word } })
        const res2 = await mongo.find(config.mongo.accountsCollection, { filter: { user } })
        const res3 = await mongo.find(config.mongo.betrayedCollection, { filter: { user } })
        if (!res.length && !res2.length && !res3.length) {
          if (!displayed) {
            verboseLog('►\tTrying to join', user, passwords.length, 'passwords found', '(' + (+id + 1) + '/' + comments.length + ')')
            displayed = true
          }
          const result = await unlock(user, word)
          await mongo.insertOne(config.mongo.trialsCollection, { user, word })
          if (result === undefined) {
            await mongo.insertOne(config.mongo.betrayedCollection, { user })
          }
          if (result) {
            await mongo.insertOne(config.mongo.accountsCollection, { user, word })
          }
          count += passwords.length
        }
      }
    }
  }
  return count
}

async function scrap () {
  await mongo.run()

  while (1) {
    const d1 = Date.now()
    try {
      verboseLog('\x1b[36m◄◄◄\t\x1b[0mGetting new batch...')
      const newComments = await fetcher.getNewComments('CircleofTrust', { limit: 1000 })
      const inboxMessages = await voter.getInbox()

      const count = await scrapFromComments([...newComments, ...inboxMessages])

      verboseLog('\x1b[36m►►►\t\x1b[0mLast batch ratio', Math.round((count / (newComments.length + inboxMessages.length)) * 10000) / 100, '%')
      const d2 = Date.now()
      await sleep(Math.max(180000 - (d2 - d1), 0))
    } catch (err) {
      if (err.message && err.message.match(/403/)) {
        console.error((err.message || err) + ' retrying in 60 seconds...')
        await sleep(60000)
      } else {
        console.error((err.message || err) + ' retrying in 10 seconds...')
        await sleep(10000)
      }
    }
  }
}

// You can import messages directly from a file

// const imported = require('../assets/users.js')
// scrapFromComments(imported).catch(err => {
//   console.error(err)
// })


// Or from db (in case you added a new regex)

// mongo.find(config.mongo.messagesCollection, {}).then(comments => {
//   console.log('Importing', comments.length, 'messages from database')
//   scrapFromComments(comments, true).then(count => {
//     console.log('Done after trying', count, 'passwords')
//   })
// }).catch(err => {
//   console.error(err)
// })

scrap().catch(err => {
  console.error(err)
})
