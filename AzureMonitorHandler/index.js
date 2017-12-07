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

// var handleCatchAll = function (event, context) {
var handleCatchAll = function (context, req) {
  var record = req.body || 'Body not found.';
  var subject = req.body.Subject || 'Subject not found';
  var timestamp = new Date(req.body.Timestamp).getTime() / 1000 || 'Timestamp not found.';
  //var message = JSON.parse(req.body);
  var message = req.body.Name;
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
          value: req.body.Name,
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
  //console.log("sns received:" + JSON.stringify(event, null, 2));
  // This is where we determine what sort of message we got from Azure.
  var slackMessage = null;
  // var eventSubscriptionArn = event.Records[0].EventSubscriptionArn;
  // var eventSnsSubject = event.Records[0].Sns.Subject || 'no subject';
  // var eventSnsMessage = event.Records[0].Sns.Message;
  var eventSubscriptionArn = req.body.Name;
  var eventSnsSubject = req.body.Subject || 'no subject';
  var eventSnsMessage = req.body.Message || 'no message';

  // if(eventSubscriptionArn.indexOf(config.services.elasticbeanstalk.match_text) > -1 || eventSnsSubject.indexOf(config.services.elasticbeanstalk.match_text) > -1 || eventSnsMessage.indexOf(config.services.elasticbeanstalk.match_text) > -1){
  //   console.log("processing elasticbeanstalk notification");
  //   slackMessage = handleElasticBeanstalk(event,context)
  // }
  // else if(eventSubscriptionArn.indexOf(config.services.cloudwatch.match_text) > -1 || eventSnsSubject.indexOf(config.services.cloudwatch.match_text) > -1 || eventSnsMessage.indexOf(config.services.cloudwatch.match_text) > -1){
  //   console.log("processing cloudwatch notification");
  //   slackMessage = handleCloudWatch(event,context);
  // }
  // else if(eventSubscriptionArn.indexOf(config.services.codedeploy.match_text) > -1 || eventSnsSubject.indexOf(config.services.codedeploy.match_text) > -1 || eventSnsMessage.indexOf(config.services.codedeploy.match_text) > -1){
  //   console.log("processing codedeploy notification");
  //   slackMessage = handleCodeDeploy(event,context);
  // }
  // else if(eventSubscriptionArn.indexOf(config.services.elasticache.match_text) > -1 || eventSnsSubject.indexOf(config.services.elasticache.match_text) > -1 || eventSnsMessage.indexOf(config.services.elasticache.match_text) > -1){
  //   console.log("processing elasticache notification");
  //   slackMessage = handleElasticache(event,context);
  // }
  // else if(eventSubscriptionArn.indexOf(config.services.autoscaling.match_text) > -1 || eventSnsSubject.indexOf(config.services.autoscaling.match_text) > -1 || eventSnsMessage.indexOf(config.services.autoscaling.match_text) > -1){
  //   console.log("processing autoscaling notification");
  //   slackMessage = handleAutoScaling(event, context);
  // }
  if (false)
  {
    false;
  } else
  {
    slackMessage = handleCatchAll(context, req);
  }

  postMessage(slackMessage, function (response) {
    if (response.statusCode < 400) {
      //console.info('message posted successfully');
      context.done();
    } else if (response.statusCode < 500) {
      //console.error('error posting message to slack API: ' + response.statusCode + ' - ' + response.statusMessage);
      // Don't retry because the error is due to a problem with the request
      context.succeed();
    } else {
      // Let Lambda retry
      context.fail('server error when processing message: ' + response.statusCode + ' - ' + response.statusMessage);
    }
  });
};

module.exports = function (context, req) {
  context.log('==============================================================');
  context.log('Node.js HTTP trigger function processed a request. RequestUri=%s', req.originalUrl);
  context.log('Function was triggered with data: \n' + JSON.stringify(context, null, 2));

  if (hookUrl) {
    processEvent(event, context);
  } else if (config.unencryptedHookUrl) {
    hookUrl = config.unencryptedHookUrl;
    // processEvent(event, context);
    processEvent(context, req);
  } else {
    context.log.error('hook url has not been set.');
  }

  context.done();
};
