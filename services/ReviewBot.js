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
      //this.bot.postMessageToChannel(config.CHANNEL_NAME, "I'm Here! :smile:");
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
        ticketPromise = Jira.getTicketsUnderReview;
        sFilter = "all";
        break;
      case this.actions.MY_TICKETS: ticketPromise = Jira.getMyTickets;
        sFilter = "your";
        break;
      default:
        return console.log("Ticket Filter unrecognized.");
    }
    // Execute method
    ticketPromise()
      .then(tickets => {
        var message = this.generateMessage(tickets);
        message.text = `Here are ${sFilter} tickets under review!`;
        this.respond(message, responseURL);
      })
      .catch(err => console.log(err));
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
    const noReviews = tickets.filter(t => {
      return (t.pass === 0 && t.reject === 0);
    }).map(t => {
      return `<${config.JIRA_ISSUE_URL}/${t.key}|${t.key}>`;
    }).join(', ');

    // Tickets with Passes
    const passed = tickets.filter(t => {
      return (t.pass > 0 && t.reject === 0);
    }).map(t => {
      return `<${config.JIRA_ISSUE_URL}/${t.key}|${t.key}>`;
    }).join(', ');

    // Tickets with Rejections
    const rejected = tickets.filter(t => {
      return (t.reject > 0 && t.pass === 0);
    }).map(t => {
      return `<${config.JIRA_ISSUE_URL}/${t.key}|${t.key}>`;
    }).join(', ');

    // Tickets with Passes and Rejections
    const mixed = tickets.filter(t => {
      return (t.pass > 0 && t.reject > 0);
    }).map(t => {
      return `<${config.JIRA_ISSUE_URL}/${t.key}|${t.key}>`;
    }).join(', ');

    // Formulate Message
    return {
      "text": "Here are the requested tickets under review!",
      "attachments": [
        {
          "text": "No Reviews:\n" + noReviews,
          "fallback": "No buttons for you!",
          "callback_id": this.actions.NEEDS_REVIEW,
          "color": "#0099ff",
        },
        {
          "text": "Passing:\n" + passed,
          "fallback": "No buttons for you!",
          "callback_id": this.actions.NEEDS_REVIEW,
          "color": "good"
        },
        {
          "text": "Rejected:\n" + rejected,
          "fallback": "No buttons for you!",
          "callback_id": this.actions.NEEDS_REVIEW,
          "color": "danger"
        },
        {
          "text": "Rejected &amp; Passed:\n" + mixed,
          "fallback": "No buttons for you!",
          "callback_id": this.actions.NEEDS_REVIEW,
          "color": "warning"
        }
      ]
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
    if (!payload.text) return this.respond({text:"Need a comment for the review!"}, responseURL);
    // Set Comment for User's Active Review
    this.reviews[payload.user_id] = {
      "comment": payload.text
    };
    // Formulate Message
    var message = {
      "attachments": [
        {
          "text": `Choose a ticket to Review! :smile:\n - "${payload.text}"`,
          "fallback": "No buttons for you!",
          "callback_id": this.actions.NEW_REVIEW,
          "color": "#6699ff",
          "attachment_type": "default",
          "actions": [
            {
              "name": "ticket",
              "text": "Ticket",
              "type": "select",
              "data_source": "external"
            },
            {
              "name": "pass",
              "text": "Pass",
              "type": "button",
              "value": "pass",
              "style": "primary"
            },
            {
              "name": "reject",
              "text": "Reject",
              "type": "button",
              "value": "reject",
              "style": "danger"
            },
            {
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
            }
          ]
        }
      ],
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
    var message = { "text": "", "replace_original": false };
    // Get Acvite Review
    var review = this.reviews[payload.user.id];
    // Handle Action
    const action = payload.actions[0].name;
    switch (action) {
      // Set User's Active Review
      case "ticket":
        review.ticket = payload.actions[0].selected_options[0].value;
        return; break;
      // Pass or Reject Desired Ticket
      case "pass":
      case "reject":
        // The user has not yet selected a ticket
        if (!review.ticket) return;
        // Notify of intent to Pass/Reject
        message.text = `${lo.capitalize(action)}ing: ${review.ticket} - "${review.comment}"`;
        message.replace_original = true;
        // Tell Jira to add Comment for Review
        Jira.addReview(action === "pass", review.ticket, review.comment);
        // Reset Review
        review = {};
        break;
      case "cancel":
        message.text = "No worries :v: I'll cancel that for you! :sunglasses:";
        message.replace_original = true;
        review = {};
        break;
      default:
        message.text = `${payload.user.name} clicked: ${action}`;
        review = {};
    }
    this.respond(message, responseURL);
  }

  /**
   * Sends response to provided URL with designated payload as body.
   * 
   * @param {Object} payload The parsed request body holding various information.
   * @param {string} responseURL The url to which responses should be sent.
   */
  respond(payload, responseURL){
    const options = { headers: { 'Content-type': 'application/json' } };
    axios.post(responseURL, payload, options)
      .then(res => { /* console.log(res); */ })
      .catch(err => { console.log(err); })
  }
}
