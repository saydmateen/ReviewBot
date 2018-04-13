const SlackBot = require('slackbots');
const Config = require('./config');

class ReviewBot {
  constructor() {
    this.bot = new SlackBot({
      token: Config.BOT_TOKEN,
      name: Config.BOT_NAME 
    });

    this.needReviewExpr = /^((what\ *)?needs)?\ *review(ing)?\?$/g;
    this.addReviewExpr = /^review (.+) (reject|fail|pass) (.+)$/g; 
  }

  handleMessage(message) {
    // Reset REGEX
    this.needReviewExpr.lastIndex = 0;
    this.addReviewExpr.lastIndex = 0;

    // Determine which command was given
    if (this.needReviewExpr.test(message)) {
      // Log Intent
      this.bot.postMessageToChannel(Config.CHANNEL_NAME,
        'Showing tickets that need reviewing!');
    } else if (this.addReviewExpr.test(message)) {
      // Reset Regex and get Matches
      this.addReviewExpr.lastIndex = 0;
      const matches = this.addReviewExpr.exec(message);
      // Determine pass or fail
      const pass = matches[2].toLowerCase() == 'pass';
      // Log Matches
      this.bot.postMessageToChannel(Config.CHANNEL_NAME,
        `Adding ${pass?'Acceptance':'Rejection'} to ${matches[1]} with comment: ${matches[3]}`);
    } else {
      // Log Intent
      this.bot.postMessageToChannel(Config.CHANNEL_NAME,
        'Unrecognized message...');
    }
  }

  start() {
    var self = this;

    // Boot Message
    this.bot.on('start', function() {
      self.bot.postMessageToChannel(Config.CHANNEL_NAME, 'Hello Friends!');
    });

    // Message Handler
    this.bot.on('message', function(data) {
      if (data.type === 'message' &&
          data.channel === Config.CHANNEL &&
          data.bot_id !== Config.BOT_ID) {

        self.handleMessage(data.text);
      }
    })
  }
}

module.exports = ReviewBot;
