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
    //console.log("Jira => Fetching Options...");
    // Get All Tickets Under Review
    getTicketsUnderReview()
    .then(tickets => {
      // Select tickets that do no belong to requresting user
      const options = {
        "options": tickets
          .filter(t => t.assignee!==email.toLowerCase())
          .map(t => {return{text: t.key, value: t.key}})
      }
      fill(options);
    })
    .catch(error => reject(error));
  });
}

/**
 * Gets all tickets under review from Jira.
 *
 * @return {Promise} of array containting properly formatted tickets.
 */
function getTicketsUnderReview() {
  //console.log("Jira => Fetching Tickets Under Review...");
  return new Promise((fill, reject) => {
    // Array of objects with issue data necessary from first query.
    let keys = [];
    // Get All Tickets to begin with
    getAllTickets()
    .then(tickets => {
      // Compose array of axios Promises to fetch comments for each issue.
      let allRequests = tickets.issues.map(issue => {
        // Add key and assignee to keys array.
        keys.push({ key: issue.key, assignee: issue.fields.assignee ? issue.fields.assignee.key : null});
        // Produce axios Promise
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
      
      // Execute all Promises simultaneously.
      axios.all(allRequests)
      // Handle each issue's comments accordingly
      .then(axios.spread((...issues) => {
        // Array of data about the issue's comments
        let issueData = [];
        issues.map((issue, index) => {
          // Count of how many comments indicate acceptance or rejection
          let rejected = 0;
          let accepted = 0;
          // Determine if comment is acceptance or rejection
          issue.data.comments.map(c => {
            if (c.body.toLowerCase().includes("accepted")) {
              accepted = accepted + 1;
            } else {
              rejected = rejected + 1;
            }
          });
          // Construct object with data about issue
          let entry = {
            "key": keys[index].key,
            "accepted": accepted,
            "rejected": rejected,
            "assignee": keys[index].assignee
          }
          issueData.push(entry);
        });
        // Fulfill Promise
        fill(issueData);
      })).catch(error => reject(error));
    }).catch(error => reject(error));
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
 * @param {string} user The user submitting the review.
 * @return {Promise} of submitting comment to Jira.
 */
function addReview(pass, issue, comment, user) {
  const action = pass ? 'Accept' : 'Reject';
  // Construct comment
  let fullComment = `${user} ${action}ed - "${comment}"`;
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

/**
 * Retrieves all tickets in the Peer Review column from Jira.
 *
 * @return {Promise} of all tickets in desired column.
 */
function getAllTickets(){
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