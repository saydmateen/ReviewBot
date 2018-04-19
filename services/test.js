const jiraService = require("./Jira");

jiraService.getAllTickets()
  .then(res => console.log(res))
  .catch(err => console.log(err));