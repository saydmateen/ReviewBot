const ReviewBot = require('./ReviewBot');
const express = require('express');
const app = express();


// Routing
app.post('/action', function(req,res) {
  console.log('Reciving an action.');
});

app.post('/options', function(req, res) {
  console.log('Receiving request for options.');
});


// Setup Slack Bot
const bot = new ReviewBot();
bot.start();

// Listen for Interactions
app.listen(3000, function() {
  console.log('Listening on 3000');
});
