require('dotenv').config();
const axios = require('axios');
const lo = require('lodash');
const SlackBot = require('slackbots');
const config = require('../config');
const Jira = require('./Jira');


exports.Bot = class ReviewBot {
  /**
   * Creates an instance of ReviewBot
   *
   * @constructor
   */
  constructor() {
    this.bot = new SlackBot({
      token: process.env.BOT_TOKEN,
      as_user: true
    });
    this.actions = {
      NEEDS_REVIEW: 'NEEDS_REVIEW',
      NEW_REVIEW: 'NEW_REVIEW',
      MY_TICKETS: 'MY_TICKETS',
      USER_RESPONSE: 'USER_RESPONSE',
    }
    this.reviews = {};
  }

  /**
   * Run once the bot establishes connection.
   * 
   * @this {ReviewBot}
   */
  start() {
    this.bot.on('start', () => {
      this.bot.postMessageToChannel(config.CHANNEL_NAME, "I'm Here! :smile:");
    });
  }

  /**
   * Dispatches indicated action with necessary information.
   *
   * @this {ReviewBot}
   * @param {Request} req The Request object from the Express endpoint.
   * @param {Response} res The Respone object from the Express endpoint.
   * @param {string} action The action desired.
   */
  handleRequest(req, res, action) {
    res.status(200).end();
    // Extract payload
    var payload = req.body;
    var responseURL = payload.response_url;
    // Determine Action to take
    switch (action) {
      // Slash Commands
      case this.actions.NEW_REVIEW:
        this.newReview(payload, responseURL);
        break;
      case this.actions.NEEDS_REVIEW:
      case this.actions.MY_TICKETS:
        this.respond({text:"Getting Tickets - be paitent!"}, responseURL);
        this.showTickets(payload, responseURL, action);
        break;
        // When a user responds to a question
      case this.actions.USER_RESPONSE:
        payload = JSON.parse(payload.payload);
        this.userResponse(payload, payload.response_url);
        break;
      default:
        console.log("Unrecognized action in handleRequest");
    }
  }

  /**
   * Responds to the user via message with formatted set of tickets.
   * 
   * @this {ReviewBot}
   * @param {Object} payload The parsed request body holding various information.
   * @param {string} responseURL The url to which responses should be sent.
   * @param {string} filter The criteria with wich to filter the tickets in Jira.
   */
  showTickets(payload, responseURL, filter) {
    // Method used to Fetch Tickets
    var ticketPromise;
    var sFilter;
    // Determine method
    switch (filter) {
      case this.actions.NEEDS_REVIEW:
        ticketPromise = Jira.getTicketsUnderReview()
        .then(tickets => {
          var message = this.generateMessage(tickets);
          message.text = `Here are all tickets under review!`;
          this.respond(message, responseURL);
        })
        .catch(err => console.log(err));
        break;
      case this.actions.MY_TICKETS:
        const email = `${payload.user_name}@${payload.team_domain}.com`;
        Jira.getMyTickets(email)
        .then(tickets => {
          var message = this.generateMessage(tickets);
          message.text = `Here are your tickets under review!`;
          this.respond(message, responseURL);
        })
        .catch(err => console.log(err));
        break;
      default:
        return console.log("Ticket Filter unrecognized.");
    }
  }

  /**
   * Formulates a message body with the desired tickets.
   * 
   * @this {ReviewBot}
   * @param {array} tickets The array of tickets to parse.
   * @return {Object} Message structure with formatted ticket info.
   */
  generateMessage(tickets) {
    // Tickets with 0 reviews
    const needs = tickets
      .filter(t => t.accepted < config.REQUIRED_REVIEWS)
      .map(t => `<${config.JIRA_ISSUE_URL}/${t.key}|${t.key}>`)
      .join(', ');

    // Tickets with Passes
    const passed = tickets
      .filter(t => t.accepted === config.REQUIRED_REVIEWS)
      .map(t => `<${config.JIRA_ISSUE_URL}/${t.key}|${t.key}>`)
      .join(', ');

    // Tickets with Rejections
    const rejected = tickets
      .filter(t => t.rejected > 0 && t.accepted === 0)
      .map(t => `<${config.JIRA_ISSUE_URL}/${t.key}|${t.key}>`)
      .join(', ');

    // Formulate Message
    return {
      "text": "Here are the requested tickets under review!",
      "attachments": [{
        "text": "Needs Review:\n" + needs,
        "fallback": "No buttons for you!",
        "callback_id": this.actions.NEEDS_REVIEW,
        "color": "warning",
      }, {
        "text": "Passed:\n" + passed,
        "fallback": "No buttons for you!",
        "callback_id": this.actions.NEEDS_REVIEW,
        "color": "good"
      }, {
        "text": "Rejected:\n" + rejected,
        "fallback": "No buttons for you!",
        "callback_id": this.actions.NEEDS_REVIEW,
        "color": "danger"
      }]
    };
  }

  /**
   * Presents user with new Review form.
   * 
   * @this {ReviewBot}
   * @param {Object} payload The parsed request body holding various information.
   * @param {string} responseURL The url to which responses should be sent.
   */
  newReview(payload, responseURL) {
    // No Comment Provided
    if (!payload.text) return this.respond({
      text: ":warning: Need a comment for the review!"
    }, responseURL);
    // Set Comment for User's Active Review
    this.reviews[payload.user_id] = {
      "comment": payload.text
    };
    // Formulate Message
    var message = {
      "text": `Choose a ticket to Review! :smile:\n - "${payload.text}"`,
      "attachments": [{
        "text": "Jira takes a while here...",
        "fallback": "No buttons for you!",
        "callback_id": this.actions.NEW_REVIEW,
        "color": "#6699ff",
        "attachment_type": "default",
        "actions": [{
          "name": "ticket",
          "text": "Ticket",
          "type": "select",
          "data_source": "external"
        }, {
          "name": "pass",
          "text": "Pass",
          "type": "button",
          "value": "pass",
          "style": "primary"
        }, {
          "name": "reject",
          "text": "Reject",
          "type": "button",
          "value": "reject",
          "style": "danger"
        }, {
          "name": "cancel",
          "text": "Cancel",
          "type": "button",
          "value": "cancel",
          "confirm": {
            "title": "Abort this Review?",
            "text": "Don't leave me.",
            "ok_text": "Yes",
            "dismiss_text": "No"
          }
        }]
      }],
      "replace_original": true
    }
    this.respond(message, responseURL);
  }

  /**
   * Handles requests that indicate user interaction with message.
   * 
   * @this {ReviewBot}
   * @param {Object} payload The parsed request body holding various information.
   * @param {string} responseURL The url to which responses should be sent.
   */
  userResponse(payload, responseURL) {
    // Empty Message
    var message = {
      "text": "",
      "replace_original": false
    };
    // Handle Action
    const action = payload.actions[0].name;
    switch (action) {
      // Set User's Active Review
      case "ticket":
        return this.reviews[payload.user.id].ticket = payload.actions[0].selected_options[0].value;
        break;
        // Pass or Reject Desired Ticket
      case "pass":
      case "reject":
        // The user has not yet selected a ticket
        const review = this.reviews[payload.user.id];
        if (!review.ticket) return;
        // Notify of intent to Pass/Reject
        message.text = `${lo.capitalize(action)}ing: ${review.ticket} - "${review.comment}"`;
        message.replace_original = true;
        // Formulate Email
        const email = `${payload.user.name}@${payload.team.domain}.com`;
        // Create Comment in Jira
        Jira.addReview(action === "pass", review.ticket, review.comment, email);
        // Reset Review
        this.reviews[payload.user.id] = {};
        break;
      case "cancel":
        message.text = "No worries :v: I'll cancel that for you! :sunglasses:";
        message.replace_original = true;
        this.reviews[payload.user.id] = {};
        break;
      default:
        message.text = `${payload.user.name} clicked: ${action}`;
        this.reviews[payload.user.id] = {};
    }
    this.respond(message, responseURL);
  }

  /**
   * Sends response to provided URL with designated payload as body.
   * 
   * @param {Object} payload The parsed request body holding various information.
   * @param {string} responseURL The url to which responses should be sent.
   */
  respond(payload, responseURL) {
    const options = {
      headers: {
        'Content-type': 'application/json'
      }
    };
    axios.post(responseURL, payload, options)
      .then(res => { /* console.log(res); */ })
      .catch(err => {
        console.log(err);
      })
  }
}