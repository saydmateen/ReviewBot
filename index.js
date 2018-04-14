const SlackBot = require('slackbots');
const Config = require('./config');

// create a bot
var bot = new SlackBot({
    token: Config.BOT_TOKEN,
    name: Config.BOT_NAME
});

JiraService = require('./services/jiraService');

JiraService.NeedsReview();