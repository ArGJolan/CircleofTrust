module.exports = {
  mongo: {
    host: '',
    port: '',
    database: '',
    accountsCollection: 'accounts',
    trialsCollection: 'trials',
    betrayedCollection: 'betrayed',
    messagesCollection: 'messages'
  },
  redditFetcher: {
    // https://www.reddit.com/prefs/apps
    client_id: '',
    client_secret: '',
    username: '',
    password: '',
    user_agent: ''
  },
  redditVoter: {
    // https://www.reddit.com/prefs/apps
    client_id: '',
    client_secret: '',
    username: '',
    password: '',
    user_agent: ''
  },
  userBlacklist: [
    // Ignore messages from these users, you usually want 'reddit' & yourself
  ],
  wordBlacklist: [
    // In case you match too many times with something you don't want to
  ],
  chromeless: {
    width: 800,
    height: 600
  },
  stringRules: [
    // Regex to find potential passwords from a message
    // I will release the one I used when the event is over
    { rule: /"(.*?)"/, pos: 1 },
    { rule: /'(.*?)'/, pos: 1 },
    { rule: /'\((.*?)\)/, pos: 1 },
    { rule: /'\[(.*?)\]/, pos: 1 },

    { rule: /[a-z]* *(key|password|magic|pass|word) *is *:* *(.*?)$/i, pos: 2 },
    { rule: /[a-z]* *(key|password|magic|pass|word) *is *:* *(.*?)[\n !\?]/i, pos: 2 },

    { rule: /^(.*?) *is *[a-z]* *(key|password|magic|pass|word)/i, pos: 1 },
    { rule: /[\n !\?](.*?) *is *[a-z]* *(key|password|magic|pass|word)/i, pos: 1 },

    { rule: /vote_key=(.*?)$/i, pos: 1 }
  ],
  wordRules: [
    // Regex to check if a single word is potentially a password
    // I will release the one I used when the event is over
    /[A-Z][a-z]+[A-Z][a-z]+[A-Z][a-z]+/,
    /[A-Z][a-z]+[A-Z][a-z]+/,
    /[A-Z][a-z]+[A-Z][a-z]+[1-9]/,
    /^[a-z]*[1-9]+[a-z]*$/i
  ],
  verbose: true
}
