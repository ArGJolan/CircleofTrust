const snoowrap = require('snoowrap')
const Mongo = require('./mongo')
const config = require('./config')

const mongo = new Mongo(config.mongo)

const blackList = []

const wordsBlackList = [
  'FeelsGoodMan'
]

const r = new snoowrap(config.reddit)

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test = async function () {
  await mongo.run()

  while (1) {
    const comments = await r.getNewComments('CircleofTrust', { limit: 500 })

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
              console.log(`https://www.reddit.com/u/${user}/posts/`)
              console.log(`${word}\n`)
              mongo.insertOne('circle', { user, word })
            }
          }
        }
      }
    }
    await sleep(10000)
  }
}

try {
  test()
} catch (err) {
  console.error(err)
}

  // try {
  //   const tmp = await r.get_new('CircleofTrust', { limit: 1000 })
  //   const result = tmp.filter(elem => {
  //     return (elem.num_comments !== 0)
  //   })
  //   console.log('Got', tmp.length, 'results, kept', result.length)
  //   result.forEach(async (elem) => {
  //     const submissionId = elem.id
  //     try {
  //       const submission = await r.get_submission(submissionId)

  //       const comments = await submission.expand_replies().comments
  //       for (let id in comments) {
  //         if (comments[id] && comments[id].author && !blackList.includes(comments[id].author) && (/[A-Z][a-z]+[A-Z][a-z]+[A-Z][a-z]+/.test(comments[id].body))) {
  //           const words = comments[id].body.replace(/\n/g, ' ').split(' ')
  //           words.forEach(word => {
  //             if (/^[A-Z][a-z]+[A-Z][a-z]+[A-Z][a-z]+$/.test(word) && !wordsBlackList.includes(word)) {
  //               console.log(`https://www.reddit.com/u/${comments[id].author.name}\t\t\t\thttps://www.reddit.com/r/CircleofTrust/comments/${submissionId}`)
  //               console.log(`${comments[id].author.name}:${word}\n`)
  //               // console.log(`${comments[id].author.name}:`, comments[id].body)
  //             }
  //           })
  //         }
  //       }
  //     } catch (err) {}
  //   })
  // } catch (err) {
  //   console.error(err)
  //   return
  // }
