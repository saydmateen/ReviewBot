require('dotenv').config();
const request = require('request');
const bodyParser = require('body-parser');
const axios = require('axios');

const express = require('express');
const app = express();


//const SlackBot = require('slackbots');
const ReviewBot = require('./services/ReviewBot');
const bot = new ReviewBot.Bot();

const Jira = require('./services/Jira');

const config = require('./config');
const urlencodedParser = bodyParser.urlencoded({
  extended: false
});


/* Routing */
// Endpoint for user interaction
app.post('/action', urlencodedParser, (req, res) => {
  bot.handleRequest(req, res, bot.actions.USER_RESPONSE);
});
// Endpoint for Attachemnt Options
app.post('/options', urlencodedParser, (req, res) => {
  // Extract payload
  const payload = JSON.parse(req.body.payload);
  // Determine which Interactive Action we're fetching options for.
  switch (payload.name) {
    case "ticket":
      Jira.getTicketOptions()
        .then(data => res.send(data))
        .catch(err => console.log(err));
      break;
    default:
      res.send("Requesting options for invalid action: " + payload.name);
  }
});


/* Slash Commands */
// Display form for new review
app.post('/slash/r-new', urlencodedParser, (req, res) => {
  bot.handleRequest(req, res, bot.actions.NEW_REVIEW);
});
// Display tickets under review
app.post('/slash/r-all', urlencodedParser, (req, res) => {
  bot.handleRequest(req, res, bot.actions.NEEDS_REVIEW);
})
// Display my tickets under review
app.post('/slash/r-mine', urlencodedParser, (req, res) => {
  bot.handleRequest(req, res, bot.actions.MY_TICKETS);
})
// Move tickets with the necessary number of passes
// to the next phase of the workflow.
// app.post('/slash/r-push', urlencodedParser, (req,res) => {
//   bot.handleRequest(req, res, bot.actions.PUSH);
// })



// Start Slack Bot
bot.start();

// Open Endpoints
app.listen(3000, function() {
  console.log('Listening on 3000');
});