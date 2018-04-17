const jiraService = require("./Jira");

jiraService.CloseSubTask().then(response => {
    console.log(response);
}).catch(response => console.log(response));