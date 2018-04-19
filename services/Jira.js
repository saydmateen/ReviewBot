require('dotenv').config();
const config = require('../config');
const axios = require('axios');

/**
 * Gets all tickets under review from Jira and formats them into
 * an options object for digestion by Slack API.
 * See https://api.slack.com/docs/message-menus
 * 
 * @param {string} email Requesting user's email.
 * @return {Promise} of object containting properly formatted options.
 */
function getTicketOptions(email) {
  return new Promise((fill, reject) => {
    getTicketsUnderReview()
      .then(tickets => {
        // Tickets that do no belong to requesting User
        const options = {
          "options": tickets
            .filter(ticket => ticket.assignee !== email.toLowerCase())
            .map(ticket => {
              return {
                text: ticket.key,
                value: ticket.key
              }
            })
        };
        // Fulfill Promise
        fill(options);
      })
      .catch(err => reject(err));
  });
}

/**
 * Gets all tickets under review from Jira.
 *
 * @return {Promise} of array containting properly formatted tickets.
 */
function getTicketsUnderReview() {
  return new Promise((fill, reject) => {
    // Array of objects containing issue data.
    let keys = [];
    // Get All Tickets
    getAllTickets()
      .then(tickets => {
        // Compose array of axios Promises to fetch comments for each issue.
        const allRequests = tickets.issues.map(issue => {
          // Add key and assignee to keys array.
          keys.push({
            key: issue.key,
            assignee: issue.fields.assignee ? issue.fields.assignee.key : null,
            subtasks: issue.fields.subtasks ? issue.fields.subtasks : []
          });
          // Produce axios Promise
          return axios({
            method: 'GET',
            url: `${config.JIRA_API_URL}/issue/${issue.key}/comment`,
            responseType: 'application/json',
            auth: {
              username: process.env.EMAIL,
              password: process.env.PASSWORD
            }
          });
        });

        // Execute all Promises simultaneously.
        axios.all(allRequests)
          // Handle each issue's comments accordingly
          .then(axios.spread((...issues) => {
            // Array of data about the issue's comments
            const issueData = issues.map((issue, index) => {
              let rejected = 0;
              let accepted = 0;
              // Determine if comment is Pass or Rejection
              issue.data.comments.map(c => {
                if (c.body.toLowerCase().includes("accepted")) {
                  accepted = accepted + 1;
                } else {
                  rejected = rejected + 1;
                }
              });
              // Construct Issue Data Object
              return {
                "key": keys[index].key,
                "accepted": accepted,
                "rejected": rejected,
                "assignee": keys[index].assignee,
                "subtasks": keys[index].subtasks
              }
            });
            // Fulfill Promise
            fill(issueData);
          }))
          .catch(err => reject(err));
      })
      .catch(err => reject(err));
  });
}

/**
 * Gets user's tickets under review from Jira.
 *
 * @param {string} email The email of the user whose tickets are returned.
 * @return {Promise} of array containting properly formatted tickets.
 */
function getMyTickets(email) {
  return new Promise((fill, reject) => {
    //console.log("Jira => Fetching My Tickets...");
    getTicketsUnderReview()
      .then(tickets => {
        // Filter by current user.
        tickets = tickets.filter(t => {
          return t.assignee === email.toLowerCase();
        });
        // Fulfill Promise
        fill(tickets);
      })
      .catch(error => reject(error));
  });
}

/**
 * Closes Peer Review Sub Task in Jira.
 *
 * @return {Promise} of how many subtasks were closed.
 */
function closeSubtasks() {
  return new Promise((fill, reject) => {
    getTicketsUnderReview()
      .then(res => {
        let subtaskIDs = [];
        // Determine which issues have subtasks
        res.filter(issue => issue.subtasks
            && issue.subtasks.length > 0
            && issue.accepted >= config.REQUIRED_REVIEWS)
          .map(issue => {
            // Determine which subtasks are applicable
            issue.subtasks.map(subtask => {
              if (subtask.fields.issuetype.name === config.SUBTASK_NAME
                  && !subtask.fields.status.name.toLowerCase().includes('closed')) {
                subtaskIDs.push(subtask.id);
              }
            });
          });

        // Build request to close all applicable subtasks
        const allRequests = subtaskIDs.map(id => {
          return axios({
            method: 'POST',
            url: `${config.JIRA_API_URL}/issue/${id}/transitions`,
            responseType: 'application/json',
            auth: {
              username: process.env.EMAIL,
              password: process.env.PASSWORD
            },
            data: {
              "transition": {
                "id": "2"
              }
            }
          });
        });

        // Close all applicable subtasks
        axios.all(allRequests)
          .then(axios.spread((...res) => fill(subtaskIDs.length)))
          .catch(err => reject(err));
      })
      .catch(err => reject(err));
  });
};


/**
 * Adds a Review (comment) to Jira with desired information.
 * 
 * @param {bool} pass Indicates whether passing or rejecting.
 * @param {string} issue The Jira issue's KEY.
 * @param {string} comment The comment content for the review.
 * @param {string} user The user submitting the review.
 * @return {Promise} of submitting comment to Jira.
 */
function addReview(pass, issue, comment, user) {
  const action = pass ? 'Accept' : 'Reject';
  // Construct comment
  const fullComment = `${user} ${action}ed - "${comment}"`;
  // Construct URL
  const url = `${config.JIRA_API_URL}/issue/${issue}/comment`;
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
      .then(res => fill(res.data))
      .catch(err => reject(err.data));
  });
}

/**
 * Retrieves all tickets in the Peer Review column from Jira.
 *
 * @return {Promise} of all tickets in desired column.
 */
function getAllTickets() {
  // JQL Parameters
  var params = {
    project: config.PROJECT,
    status: config.STATUS,
    resolution: 'Unresolved'
  };
  params = Object.keys(params)
    .map(p => `${p}=${params[p]}`)
    .join(' AND ');
  // JQL Fields
  const fields = ['key', 'assignee', 'subtasks'].join(',');

  // Construct URL
  const url = `${config.JIRA_API_URL}/search?jql=${params}&fields=${fields}`;

  // Fire Request 
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
      .catch(error => reject(error.data));
  });
}

module.exports = {
  getTicketOptions,
  getTicketsUnderReview,
  getMyTickets,
  addReview,
  getAllTickets,
  closeSubtasks
}