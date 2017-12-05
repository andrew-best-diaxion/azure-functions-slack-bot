var getColor = function (status) {
  if (status === 'Resolved') {
    return 'good';
  } else {
    return 'danger';
  };
};

module.exports = function (context, data) {
  // useful to uncomment when debugging.
  context.log('=========================');
  context.log('Node.js HTTP trigger function processed a request. RequestUri=%s', req.originalUrl);
  context.log('Function was triggered with data: \n' + JSON.stringify(data, null, 2));
  var slackUrl = process.env.SLACK_URL;
  var slackChannel = process.env.SLACK_CHANNEL;

  var request = require('request');

  //
  // var status = 'unknown'; // will be "Activated" or "Resolved"
  // var resourceName = 'unknown';
  // var text;
  // var attachments = [];
  //
  // if (data) {
  //   var slackUrl = process.env.SLACK_URL;
  //   var slackChannel = process.env.SLACK_CHANNEL;
  //   context.log('Slack webhook: ' + slackUrl);
  //   context.log('Slack channel: ' + slackChannel);
  //
  //   // we expect a message of the form described here: https://docs.microsoft.com/en-us/azure/monitoring-and-diagnostics/insights-webhooks-alerts
  //   if (data.context) {
  //     context.log('data is not empty');
  //     try {
  //
  //       text = "Azure Alert";
  //       attachments.push({
  //         "fallback": 'update your client',
  //         "color": getColor(data.status),
  //         "title": data.status,
  //         "text": data.context.conditionType + " " + data.context.name + "\n" + data.context.description + "\n<" + data.context.portalLink + "|View Alert>"
  //       });
  //     } catch (e) {
  //       text = "Azure Alert Error";
  //       attachments.push({
  //         "fallback": 'update your client',
  //         "color": 'warning',
  //         "title": e,
  //         "text": "Payload\n" + JSON.stringify(data, null, 2)
  //       });
  //     }
  //   } else {
  //     context.log('context is empty');
  //     text = "Azure Alert Error";
  //     attachments.push({
  //       "fallback": 'update your client',
  //       "color": 'warning',
  //       "title": 'Error',
  //       "text": "Payload does not have a context\n" + JSON.stringify(data, null, 2)
  //     });
  //   }
  //
  //   var msg = {
  //     channel: 'slackChannel',
  //     // username: 'testbot',
  //     // icon_emoji: ':lightning_cloud:',
  //     mrkdwn: true,
  //     text: text,
  //     fallback: 'update your client',
  //     attachments: attachments
  //   };
  //   context.log('Message:' + JSON.stringify(msg, null, 2));
  //
  //   // and POST it
  //   request({
  //       method: 'POST',
  //       uri: slackUrl,
  //       json: true,
  //       body: msg,
  //     },
  //     function (error, response, body) {
  //       if (response.statusCode == 200) {
  //         context.res = {
  //           body: 'Posted successfully',
  //         };
  //         context.log('Posted successfully');
  //       } else {
  //         context.res = {
  //           status: response.statusCode,
  //           body: 'Error: ' + body,
  //         };
  //       }
  //     });
  // };

  context.done;
};
