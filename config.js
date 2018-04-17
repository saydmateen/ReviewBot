const config = {
  CHANNEL_NAME: 'review_bot', //Slack Channel
  PROJECT: 'BPY', // Jira Project 
  REQUIRED_REVIEWS: 2, // Number of required reviews before a task is passed
  REVIEW_COLUMN: 'Code Review', // Jira Column where the code review tasks are placed
  JIRA_DOMAIN: 'https://jira.powerschool.com', // Jira Domain 
  STATUS: "\"Code Review\"", // Jira task name 
  SUBTASK_NAME: "Peer Review" // Jira subtask name 
}

module.exports = config;