var request = require('request');

var noticeToAttach = function (arr) {

  //context.log('noticeToAttach called with argument: ' + arr);
  var attachments = [];
  var getColor = function (noticeType) {

    //context.log('getColor function triggered with noticeType set to ' + noticeType);

    // See the schema for event levels
    // https://docs.microsoft.com/en-us/azure/monitoring-and-diagnostics/monitoring-activity-log-schema
    if (noticeType === 'critical' || noticeType === 'error') {
      return 'danger';
    } else if (noticeType === 'warning' || noticeType === 'Warning') {
      return 'warning';
    } else {
      return 'good';
    };
  };

  for (var i = 0, len = arr.length; i < len; i++) {
    var notice = arr[i];
    attachments.push({
      fallback: notice.text,
      color: getColor(notice.type),
      title: notice.title,
      test: notice.text,
    });
  }

  return attachments;
};

module.exports = function (context, req) {
  context.log('==============================================================');
  context.log('Node.js HTTP trigger function processed a request. RequestUri=%s', req.originalUrl);

  //context.log('Function was triggered with data: \n' + JSON.stringify(context, null, 2));

  // retrieve the environment variable from the 'App Settings' as this a kinda secret
  // 20121207 - MOVED TO fnSendToSlack
  // var slackUrl = process.env.SLACK_URL;
  // var slackChannel = process.env.SLACK_CHANNEL;

  // context.log('Slack Webhook URL: ' + slackUrl);
  // context.log('Slack Channel: ' + slackChannel);
  // context.log('Notifications contained: \n' + JSON.stringify(req.body.notifications, null));

  var fnSendMessageToSlack = function (slackMessageData) {
    // Function that will accept parsed params for sending to Slack as a message.
    // Function expects an array with a list of things for the Slack message.
    // There are two types of data we want to put into our message:
    //  - Type 1: data that doesnt vary with each message
    //            eg slackChannel, slackUsername, mrkdwn, fallback
    //  - Type 2: data that does vary depending on the message.
    //            text
    //            attachments

    // start function code.
    // Type 1 message elements:
    var slackUrl = process.env.SLACK_URL;
    var slackChannel = process.env.SLACK_CHANNEL;

    //var slackUsername = process.env.SLACK_USER; // the username we post to slack as
    var slackUsername = 'AzureOperationsMonitor';
    var slackMessageMrkdwn = true;
    var slackMessageFallback = 'update your client';

    // Type 2 messages come from slackMessageData array.
    var slackMessageText = slackMessageData[0];
    var slackMessageAttachments = slackMessageData[1];

    //
    // Build our Slack message body here.
    var msg = {
      channel: slackChannel,
      username: slackUsername,
      mrkdwn: slackMessageMrkdwn,
      text: slackMessageText,
      fallback: slackMessageFallback,

      //attachments: noticeToAttach(req.body.notifications),
    };

    //
    // Submit our request to the Slack Webhook URL
    request({
        method: 'POST',
        uri: slackUrl,
        json: true,
        body: msg,
      },

      //
      // Handle the Slack webhook submission response.
      function (error, response, body) {
        if (response.statusCode == 200) {
          context.res = {
            body: 'Posted Successfully.',
          };
          context.log('Posted Successfully.');
        } else {
          context.res = {
            status: response.StatusCode,
            body: `error: ` + body,
          };
        }

        context.done();
      });

  };

  if (req.body) // if we have a req.body to pass.
  {
    fnSendMessageToSlack('Body found. DummyParam');
  } else // req.body wasnt found.
  {
    context.log.error('req.body was not found in the incoming request from Azure.');
    fnSendMessageToSlack('Body NOT found. DummyParam');
  }

  context.done();
};
