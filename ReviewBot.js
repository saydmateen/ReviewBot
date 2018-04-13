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
  
  determineAction(message) {
    // Reset REGEX
    this.needReviewExpr.lastIndex = 0;
    this.addReviewExpr.lastIndex = 0;

    // Determine which command was given
    if (this.needReviewExpr.test(message)) {
      // Query JIRA & Mongo
      this.showNeedsReview();
    } else if (this.addReviewExpr.test(message)) {
      this.addReviewExpr.lastIndex = 0;
      const matches = this.addReviewExpr.exec(message);
      const ticket = matches[1];
      const pass = matches[2].toLowerCase() == 'pass';
      const comment = matches[3];
      // Add Review to JIRA & Mongo
      this.addReview(ticket, pass, comment);
    } else {
      // Command not Recognized
      this.bot.postMessageToChannel(Config.CHANNEL_NAME, 'Unrecognized message...');
    }
  }

  showNeedsReview() {
    this.bot.postMessageToChannel(Config.CHANNEL_NAME,
      'Showing tickets that need reviewing!');
    // TODO: JIRA API get applicable tickets
    // project = BPY AND status = "Code Review" AND resolution = Unresolved
  }

  addReview(ticket, pass, comment) {
    // Log Intent
    this.bot.postMessageToChannel(Config.CHANNEL_NAME,
      `Adding ${pass?'Acceptance':'Rejection'} to ${ticket} with comment: ${comment}`);
    // TODO: JIRA API Create Applicable comment
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

        self.determineAction(data.text);
      }
    })
  }
}

module.exports = ReviewBot;
