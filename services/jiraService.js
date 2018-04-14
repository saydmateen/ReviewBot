var config = require('../config');
var axios = require('axios');
var comment = [];
function NeedsReview() {
    var jql = "project = " + config.PROJECT + " AND status = " + config.STATUS + " AND resolution = Unresolved&fields=key";
    axios({
        method: 'GET',
        url: 'https://jira.powerschool.com/rest/api/2/search?jql=' + jql,
        responseType: 'application/json',
        auth: {
            username: config.USERNAME,
            password: config.PASSWORD
        },
    })
    .then(function (response) {
        let data = response.data.issues;
        data.map(issue =>{
            let rejected = 0;
            let accepted = 0; 
            axios({
                method: 'GET',
                url: 'https://jira.powerschool.com/rest/api/2/issue/' + issue.key + "/comment",
                responseType: 'application/json',
                auth: {
                    username: config.USERNAME,
                    password: config.PASSWORD
                },
            })
            .then(function (response){
                response.data.comments.map(c => {
                    //console.log(c);
                    if (c.body.toLowerCase().includes("accepted")){
                        accepted = accepted + 1;
                    }else{
                        rejected = rejected + 1;
                    }
                }); 
                comment.push({ "key": issue.key, "accepted": accepted, "rejected": + rejected });  
            })
        });
    })
    .catch(function (error) {
        console.log(error);
    });
}

module.exports = {
    NeedsReview: NeedsReview
}