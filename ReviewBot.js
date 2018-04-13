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
    console.log(`Handling: '${message}'`);

    if (this.needReviewExpr.test(message)) {
      this.bot.postMessageToChannel(Config.CHANNEL_NAME,
        'Showing tickets that need reviewing!');
    } else if (this.addReviewExpr.test(message)) {
      this.bot.postMessageToChannel(Config.CHANNEL_NAME,
        'Adding review to ticket!');
    } else {
      this.bot.postMessageToChannel(Config.CHANNEL_NAME,
        'Unrecognized message...');
    }
  }

  start() {
    var self = this;

    // Boot Message
    this.bot.on('start', function() {
      self.bot.postMessageToChannel('review_bot', 'Hello Friends!');
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
