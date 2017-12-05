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

  var slackUrl = process.env.SLACK_URL;
  var slackChannel = process.env.SLACK_CHANNEL;

  // retrieve the environment variable from the 'App Settings' as this a kinda secret
  context.log('Slack Webhook URL: ' + slackUrl);
  context.log('Slack Channel: ' + slackChannel);
  context.log('Notifications contained: \n' + JSON.stringify(req.body.notifications, null));

  var msg = {
    channel: slackChannel,
    username: req.body.username,
    icon_emoji: req.body.icon_emoji,
    mrkdwn: true,
    text: req.body.text,
    fallback: req.body.fallback,
    attachments: noticeToAttach(req.body.notifications),
  };

  request({
    method: 'POST',
    uri: slackUrl,
    json: true,
    body: msg,
  },
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

  // if (req.query.name || (req.body && req.body.name)) {
  //   context.res = {
  //     // status: 200, /* Defaults to 200 */
  //     body: 'Hello ' + (req.query.name || req.body.name),
  //   };
  // } else {
  //   context.res = {
  //     status: 400,
  //     body: 'Please pass a name on the query string or in the request body',
  //   };
  // }
  //
  // context.done();
};
