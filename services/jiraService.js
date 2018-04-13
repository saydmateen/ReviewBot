var config = require('../config');
var axios = require('axios');

function getBoard() {
    axios({
            method: 'GET',
            url: 'https://jira.powerschool.com/rest/agile/1.0/board/733',
            responseType: 'JSON',
            auth: {
                username: config.USERNAME,
                password: config.PASSWORD
            },
        })
        .then(function (response) {
            console.log(response);
        })
        .catch(function (error) {
            console.log(error);
        });
}

module.exports = {
    getBoard: getBoard
}