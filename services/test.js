const jiraService = require("./Jira");

jiraService.CloseSubTask("BPY-4").then(response => {
    console.log(response);
}).catch(response => console.log(response));

