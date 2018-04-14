require('dotenv').config();
const config = require('../config');
const axios = require('axios');

var comment = [];

// Dummy Tickets
const tickets = [{
  "key": "BPM-000",
  "pass": 0,
  "reject": 0
}, {
  "key": "BPM-100",
  "pass": 1,
  "reject": 0
}, {
  "key": "BPM-001",
  "pass": 0,
  "reject": 1
}, {
  "key": "BPM-101",
  "pass": 1,
  "reject": 1
}, {
  "key": "BPM-102",
  "pass": 1,
  "reject": 2
}, {
  "key": "BPM-201",
  "pass": 2,
  "reject": 1
}]

/**
 * Gets all tickets under review from Jira and formats them into
 * an options object for digestion by Slack API.
 * See https://api.slack.com/docs/message-menus
 * 
 * @return {Promise} of object containting properly formatted options.
 */
function getTicketOptions() {
  return new Promise(function(fill, reject) {
    console.log("Jira => Fetching Options...");
    var options = {
      "options": tickets.map(t => {
        return {
          text: t.key,
          value: t.key
        };
      })
    }
    fill(options);
  });
}

/**
 * Gets all tickets under review from Jira.
 *
 * @return {Promise} of array containting properly formatted tickets.
 */
function getTicketsUnderReview() {
  return new Promise((fill, reject) => {
    console.log("Jira => Fetching All Tickets...");
    fill(tickets);
  });
}

/**
 * Gets user's tickets under review from Jira.
 *
 * @return {Promise} of array containting properly formatted tickets.
 */
function getMyTickets() {
  return new Promise((fill, reject) => {
    console.log("Jira => Fetching My Tickets...");
    fill(tickets);
  });
}

/**
 * Adds a Review (comment) to Jira with desired information.
 * 
 * @param {bool} pass Indicates wether passing or rejecting.
 * @param {string} issue The Jira issue's KEY.
 * @param {string} comment The comment content for the review.
 */
function addReview(pass, issue, comment) {
  const action = pass ? 'Pass' : 'Reject';
  console.log(`Jira => ${action}ing: ${issue} - "${comment}"`);
}



function NeedsReview() {
  const jql = "project = " + config.PROJECT + " AND status = " + config.STATUS + " AND resolution = Unresolved&fields=key";
  axios({
      method: 'GET',
      url: 'https://jira.powerschool.com/rest/api/2/search?jql=' + jql,
      responseType: 'application/json',
      auth: {
        username: process.env.USERNAME,
        password: process.env.PASSWORD
      },
    })
    .then(function(response) {
      let data = response.data.issues;
      data.map(issue => {
        let rejected = 0;
        let accepted = 0;
        axios({
            method: 'GET',
            url: 'https://jira.powerschool.com/rest/api/2/issue/' + issue.key + "/comment",
            responseType: 'application/json',
            auth: {
              username: process.env.USERNAME,
              password: process.env.PASSWORD
            },
          })
          .then(function(response) {
            response.data.comments.map(c => {
              //console.log(c);
              if (c.body.toLowerCase().includes("accepted")) {
                accepted = accepted + 1;
              } else {
                rejected = rejected + 1;
              }
            });
            comment.push({
              "key": issue.key,
              "accepted": accepted,
              "rejected": +rejected
            });
            console.log(comment);
          })
      });
    })
    .catch(function(error) {
      console.log(error);
    });
}

module.exports = {
  getTicketOptions,
  getTicketsUnderReview,
  getMyTickets,
  addReview
}