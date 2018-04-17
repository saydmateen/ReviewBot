const ReviewBot = require('./services/ReviewBot');
const bot = new ReviewBot.Bot();
const Jira = require('./services/Jira');
const config = require('./config');

Jira.getTicketsUnderReview()
    .then(tickets => {
        const message = bot.generateMessage(tickets);
        bot.bot.postMessageToChannel(config.CHANNEL_NAME, null, message).then(status => {});
    }).catch(err => process.exit(1));

Jira.CloseSubTask()
    .then(results => {
        process.exit();
    }).catch(err => process.exit(1));
