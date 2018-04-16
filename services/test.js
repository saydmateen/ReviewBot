const jiraService = require("./Jira");

//jiraService.getTicketsUnderReview()
jiraService.getTicketOptions("spencer.mcwilliams@powerschool.com")
//jiraService.getAllTickets()
.then(res => console.log(res))
.catch(err => console.log(err));