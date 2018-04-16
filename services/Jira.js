require('dotenv').config();
const config = require('../config');
const axios = require('axios');

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
function getTicketOptions(email) {
  return new Promise((fill, reject) => {
    console.log("Jira => Fetching Options...");
    getTicketsUnderReview().then(tickets => {
      tickets = tickets.filter(ticket => {
        return ticket.assignee !== email.toLowerCase();
      });
      var options = {
        "options": tickets.map(t => {
          return {
            text: t.key,
            value: t.key
          };
        })
      }
      fill(options);
    }).catch(error => reject(error));
  });

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
  console.log("Jira => Fetching Tickets Under Review...");
  return new Promise((fill, reject) => {
    let keys = [];
    getAllTickets()
    .then(tickets => {
      let allRequests = tickets.issues.map(issue => {
        keys.push({ key: issue.key, assignee: issue.fields.assignee ? issue.fields.assignee.key : null});
        return axios({
          method: 'GET',
          url: 'https://jira.powerschool.com/rest/api/2/issue/' + issue.key + "/comment",
          responseType: 'application/json',
          auth: {
            username: process.env.EMAIL,
            password: process.env.PASSWORD
          }
        });
      });
      
      axios.all(allRequests)
      .then(axios.spread((...issues) => {
        let comments = [];
        issues.map((issue, index) => {
          let rejected = 0;
          let accepted = 0;
          issue.data.comments.map(c => {
            if (c.body.toLowerCase().includes("accepted")) {
              accepted = accepted + 1;
            } else {
              rejected = rejected + 1;
            }
          });
          let entry = {
            "key": keys[index].key,
            "accepted": accepted,
            "rejected": rejected,
            "assignee": keys[index].assignee
          }
          comments.push(entry);
        });
        fill(comments);
      })).catch(error => reject(error));
    }).catch(error => reject(error));

  });
}

/**
 * Gets user's tickets under review from Jira.
 *
 * @return {Promise} of array containting properly formatted tickets.
 */
function getMyTickets(email) {
  return new Promise((fill, reject) => {
    console.log("Jira => Fetching My Tickets...");
    getTicketsUnderReview().then(tickets => {
      tickets = tickets.filter(ticket => {
        return ticket.assignee === email.toLowerCase();
      });
      fill(tickets);
    }).catch(error => reject(error));
  });
}

/**
 * Closes Peer Review Sub Task in Jira.
 *
 * @return {Promise} of array containting properly formatted tickets.
 */
function CloseSubTask(key) {
  return new Promise((fill, reject) => {
    console.log("Jira => Closing Sub Task...");
    getAllTickets().then(tickets => {
      let id = null;
      tickets.issues.filter(ticket => key === ticket.key).map(ticket => {
        let subTask = ticket.fields.subtasks.filter(tasks => {
          if (tasks.fields.issuetype.name === config.SUBTASK_NAME) {
            id = tasks.id;
          }
        });
      });
      if(id != null){
        let url = 'https://jira.powerschool.com/rest/api/2/issue/' + id + '/transitions';
        axios({
          method: 'POST',
          url: url,
          responseType: 'application/json',
          auth: {
            username: process.env.EMAIL,
            password: process.env.PASSWORD
          },
          data: {
            "transition": { "id": "2" } 
          }
        })
          .then(response => fill(response.data))
          .catch(error => reject(error.data))
      }
    })
      .catch(error => reject(error));
  });
}

/**
 * Adds a Review (comment) to Jira with desired information.
 * 
 * @param {bool} pass Indicates wether passing or rejecting.
 * @param {string} issue The Jira issue's KEY.
 * @param {string} comment The comment content for the review.
 */
function addReview(pass, issue, comment, email) {
  const action = pass ? 'Pass' : 'Reject';
  let fullComment = `${email} ${action}ed - "${comment}"`;
  console.log(`Jira => ${fullComment}"`);
  const url = 'https://jira.powerschool.com/rest/api/2/issue/' + issue + '/comment';
  return new Promise((fill, reject) => {
    axios({
      method: 'POST',
      url: url,
      responseType: 'application/json',
      auth: {
        username: process.env.EMAIL,
        password: process.env.PASSWORD
      },
      data: {
        body: fullComment
      }
    })
      .then(response => fill(response.data))
      .catch(error => reject(error.data))
  });
}

function getAllTickets(){
  console.log("Jira => Fetching All Tickets...");
  const url = 'https://jira.powerschool.com/rest/api/2/search?jql=' + "project = " + config.PROJECT + " AND status = " + config.STATUS + " AND resolution = Unresolved&fields=key,assignee,subtasks";
  return new Promise((fill, reject) => {
    axios({
      method: 'GET',
      url: url,
      responseType: 'application/json',
      auth: {
        username: process.env.EMAIL,
        password: process.env.PASSWORD
      },
    })
    .then(response => fill(response.data))
    .catch(error => reject(error.data))
  });
}

module.exports = {
  getTicketOptions,
  getTicketsUnderReview,
  getMyTickets,
  addReview,
  getAllTickets,
  CloseSubTask
}