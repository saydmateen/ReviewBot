# ReviewBot

This review bot will get status information from your Jira board and display it on Slack.
You will need various information from both Slack and Jira configured in your enviroment.

## Getting Started

Navigate to the config.js and .env file and update all the required fields which will correspond to your particular enviroment setup. 
For the .env the following needs to be configured:
CLIENT_ID=''
CLIENT_SECRET=
EMAIL=
PASSWORD=
ACCESS_TOKEN=
BOT_USER_ID=
BOT_TOKEN=

### Prerequisites

NodeJS installed

### Installing

Install the neccessary packages using npm install. 

```
npm install
```

## Running the tests

Configure the function you want to test in test.js
Run it with 
```
npm run test
```

### How to configure the tests

There is a test.js under servies to test any of the Jira API's. 
Configure the test.js like below with the API you want to test.
```
jiraService.CloseSubTask();
```

## Built With

* [NodeJS](https://nodejs.org/) - The web framework used

## Versioning

1.0.0

## Authors

* **Sayd Mateen** - *Initial work* - [BitBucket](https://bitbucket.org/saydmateen/) 
* **Spencer McWilliams** - *Initial work* - [BitBucket](https://bitbucket.org/spencermcw/) 
* **Jason Dietrich** - *Initial work* - [BitBucket](https://bitbucket.org/jason_dietrich/) 

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details


