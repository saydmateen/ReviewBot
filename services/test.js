
const jiraService = require("./Jira");

jiraService.addReview(true, "BPY-8", "Hello From Slackbot", "sayd.mateen@powerschool.com").then(response => {
    console.log(response);
}).catch(response => console.log(response));