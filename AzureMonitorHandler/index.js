// Based on:
// https://github.com/assertible/lambda-cloudwatch-slack/blob/master/index.js

var url = require('url');         // https://www.npmjs.com/package/url
var _ = require('lodash');        // https://www.npmjs.com/package/lodash
var https = require('https');
var config = require('./config');
var hookUrl;

var baseSlackMessage = {
  channel: config.slackChannel,
  username: config.slackUsername,
  icon_emoji: config.icon_emoji,
  attachments: [{
    footer: config.orgName,
    footer_icon: config.orgIcon,
  },
  ],
};

var postMessage = function (message, callback) {
  var body = JSON.stringify(message);
  var options = url.parse(hookUrl);
  options.method = 'POST';
  options.headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  };

  var postReq = https.request(options, function (res) {
    var chunks = [];
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      return chunks.push(chunk);
    });

    res.on('end', function () {
      var body = chunks.join('');
      if (callback) {
        callback({
          body: body,
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
        });
      }
    });

    return res;
  });

  postReq.write(body);
  postReq.end();
};

var getColor = function (noticeType) {

  // See the schema for event levels
  // https://docs.microsoft.com/en-us/azure/monitoring-and-diagnostics/monitoring-activity-log-schema
  if (noticeType === 'critical' || noticeType === 'error' || noticeType === 'Failed') {
    return 'danger';
  } else if (noticeType === 'warning' || noticeType === 'Warning') {
    return 'warning';
  } else {
    return 'good';
  };
};

var handleOperationsActivity = function (context, req) {
    var record = req.body || 'No data found in body.';
    var activityLog = req.body.data.context.activityLog || 'activityLog not found in payload.';
    var claims = JSON.parse(activityLog.claims);
    var source = claims.ipaddr;
    var actor = activityLog.caller;
    var action = activityLog.operationName.split('/')[2];
    var type = activityLog.resourceType.split('/')[1];
    var object = activityLog.resourceId.split('/')[8];
    var status = activityLog.status;
    var timestamp = new Date(activityLog.eventTimestamp).getTime() / 1000 || 'Timestamp not found.';
    var subject = 'Subscription Activity by ' + actor + ' from ' + source;

    // There are a few status/result fields in the JSON we received. They are:
    // - activityLog.status (values are: Started, In Progress, Succeeded, Failed, Active, Resolved)
    // - activityLog.level (values: “Critical”, “Error”, “Warning”, “Informational” and “Verbose”)
    // See https://docs.microsoft.com/en-us/azure/monitoring-and-diagnostics/monitoring-activity-log-schema
    if (activityLog.status === 'Failed')
    { // we want to force the message colour to be red if a task failed.
      var color = getColor('Failed');
    } else {
      var color = getColor(activityLog.level);
    };

    // Add all of the values from the event message to the Slack message description
    // var description = '';
    // for (key in message) {
    //   var renderedMessage = typeof message[key] === 'object' ?
    //     JSON.stringify(message[key]) : message[key];
    //   description = description + '\n' + key + ': ' + renderedMessage;
    // }

    var slackMessage = {
      text: '*' + subject + '*',
      attachments: [{
        color: color,
        fields: [
          { title: 'Action', value: action, short: true, },
          { title: 'Status', value: status, short: true, },
          { title: 'Type', value: type, short: true, },
          { title: 'Object', value: object, short: false, },
        ],
        ts: timestamp,
      },
      ],
    };

    return _.merge(slackMessage, baseSlackMessage);
  };

var handleCatchAll = function (context, req) {
  var record = req.body || 'Body not found.';
  var subject = req.body.Subject || 'Catchall Notification Triggered.';
  var timestamp = new Date(req.body.Timestamp).getTime() / 1000 || 'Timestamp not found.';
  var message = req.body;
  var color = 'warning';

  if (message.NewStateValue === 'ALARM') {
    color = 'danger';
  } else if (message.NewStateValue === 'OK') {
    color = 'good';
  }

  // Add all of the values from the event message to the Slack message description
  var description = '';
  for (key in message) {
    var renderedMessage = typeof message[key] === 'object' ?
      JSON.stringify(message[key]) :
      message[key];

    description = description + '\n' + key + ': ' + renderedMessage;
  }

  var slackMessage = {
    text: '*' + subject + '*',
    attachments: [{
      color: color,
      fields: [{
          title: 'Message',
          value: 'Unknown message received.',
          short: false,
        },
        {
          title: 'Description',
          value: description,
          short: false,
        },
      ],
      ts: timestamp,
    },
    ],
  };

  return _.merge(slackMessage, baseSlackMessage);
};

var processEvent = function (context, req) {
  // This is where we determine what sort of message we got from Azure.
  var slackMessage = null;

  // var eventSubscriptionArn = event.Records[0].EventSubscriptionArn;
  // var eventSnsSubject = event.Records[0].Sns.Subject || 'no subject';
  // var eventSnsMessage = event.Records[0].Sns.Message;
  var eventSubscriptionArn = req.body.Name;
  var eventSnsSubject = req.body.Subject || 'no subject';
  var eventSnsMessage = req.body.Message || 'no message';

  if (req.body.data.context.activityLog.channels.indexOf(config.services.operationsactivity.match_text) > -1)
  {
    // handle an Operations event.
    slackMessage = handleOperationsActivity(context, req);
  } else
  {
    // handle an undetected event.
    slackMessage = handleCatchAll(context, req);
  }

  postMessage(slackMessage, function (response) {
    if (response.statusCode < 400) {
      context.done();
    } else if (response.statusCode < 500) {
      context.succeed();
    } else {
      context.fail('server error when processing message: ' +
                    response.statusCode + ' - ' + response.statusMessage);
    }
  });
};

module.exports = function (context, req) {
  context.log('==============================================================');
  context.log('Node.js HTTP trigger function processed a request. RequestUri=%s', req.originalUrl);
  context.log('Function was triggered with data: \n' + JSON.stringify(context, null, 2));

  if (hookUrl) {
    processEvent(context, req);
  } else if (config.unencryptedHookUrl) {
    hookUrl = config.unencryptedHookUrl;
    processEvent(context, req);
  } else {
    context.log.error('hook url has not been set.');
  }

};
