require('dotenv').config();
const request = require('request');
const axios = require('axios');
const express = require('express');
const app = express();
const ReviewBot = require('./services/ReviewBot');
const bot = new ReviewBot.Bot();
const Jira = require('./services/Jira');
const config = require('./config');
const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({
  extended: false
});


/* ROUTING */
// Endpoint for user interaction
app.post('/action', urlencodedParser, (req, res) => {
  bot.handleRequest(req, res, bot.actions.USER_RESPONSE);
});

// Endpoint for Attachemnt Options
app.post('/options', urlencodedParser, (req, res) => {
  // Extract payload
  const payload = JSON.parse(req.body.payload);
  const email = `${payload.user.name}@${payload.team.domain}.com`;
  // Determine which Interactive Action we're fetching options for.
  switch (payload.name) {
    case "ticket":
      Jira.getTicketOptions(email)
        .then(data => res.send(data))
        .catch(err => console.log(err));
      break;
    default:
      res.send("Requesting options for invalid action: " + payload.name);
  }
});


/* SLASH COMMAND ENPOINTS */
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


/* START SERVER */
bot.start();
app.listen(3000, function() {
  console.log('Listening on 3000');
});