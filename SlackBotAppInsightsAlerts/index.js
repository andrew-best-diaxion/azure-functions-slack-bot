// a helper to validate a JSON object
var validator = function (json) {
  try {
    JSON.parse(json);
    return true;
  } catch (e) {
    return false;
  }
};

// a helper converting the notifications to Slack attachments
var noticeToAttach = function (arr) {
  var attachments = [];
  console.log('noticeToAttach was called');
};

var getColor = function (noticeType) {
  // See the schema for event levels
  // https://docs.microsoft.com/en-us/azure/monitoring-and-diagnostics/monitoring-activity-log-schema
  if (noticeType === 'critical' || noticeType === 'error') {
    return 'danger';
  } else if (noticeType === 'warning' || noticeType === 'Warning') {
    return 'warning';
  } else {
    return 'good';
  };

  for (var i = 0, len = arr.length; i < len; i++) {
    var notice = arr[i];
    attachments.push({
      fallback: notice.text,
      color: getColor(notice.type),
      title: notice.title,
      text: notice.text,
    });
  }

  return attachments;
};

module.exports = function (context, req) {
  var request = require('request');

  // useful to uncomment when debugging.
  context.log('=========================');
  context.log('Node.js HTTP trigger function processed a request. RequestUri=%s', req.originalUrl);

  // context.log('Function was triggered with data: ' + JSON.stringify(req, null, 2));
  var slackUrl = process.env.SLACK_URL;

  // retrieve the environment variable from the 'App Settings' as this a kinda secret
  context.log('Slack Webhook URL: ' + slackUrl);

  // validate the BODY as being a valid JSON object
  context.log('Is {}}?: ' + validator('{}')); // true JSON received
  context.log('Is req.body valid?: ' + validator(req.body)); // true JSON not received

  // in some cases req.body comes as a valid object, sometimes as a string
  var payload;
  if (validator(req.body)) {
    payload = JSON.parse(req.body);
    context.log('function detected JSON being received');
  } else {
    payload = req.body;
    context.log('function detected string being received');
  }

  context.log('Body: ' + payload);
  context.log('channels: ' + payload.channels);

  // Build our Slack message
  // prestage some vars
  var resourceName = 'unknown';
  var text;
  var attachments = [];

  // The schema we are passing is described at:
  // https://docs.microsoft.com/en-us/azure/monitoring-and-diagnostics/monitoring-activity-log-schema
  if (req) {
    // If we have a request body
    context.log('Request body found.');
    context.log('Determining alert category.');

    // The Administrative category has no .value and a .channels = Operation
    if (payload.category == undefined && payload.channels === 'Operation') {
      context.log('Detected an Administrative Alert. Switch not required.');
      text = 'Azure Administrative Alert.';

      // Throw our alert.
      attachments.push({
        fallback: 'update your client',
        color: getColor(payload.level),
        title: payload.level,
        text: payload.description + '\n'
              + payload.claims.name + ' '
              + payload.caller + ' from '
              + payload.httpRequest.clientIpAddress + '\n' +
          payload.properties.statusCode + ': ' + payload.operationName.value + '\n' +
          'Result: ' + payload.status.value,
      });

    } else {
      context.log('Detected a non-Administrative Alert.');
      try { // Try and run this
        // Lets see which category of notice we got
        switch (payload.category.value) {
          // category.value === Administrative
          case 'Administrative':
            context.log('Switch: ' + payload.category.value);
            text = 'Azure ' + payload.category.value + ' Alert.';

            // Throw our alert.
            attachments.push({
              fallback: 'update your client',
              color: getColor(payload.level),
              title: payload.level,
              text: payload.description + '\n'
                    + payload.claims.name + ' '
                    + payload.caller + ' from '
                    + payload.claims.ipaddr + '\n' +
                payload.properties.statusCode + ': ' + payload.operationName.value + '\n' +
                'Result: ' + payload.status.value,
            });
            break;

          // category.value === ServiceHealth
          case 'ServiceHealth':
            context.log('Switch: ' + payload.category.value);
            text = 'Azure ' + payload.category.value + ' Alert.';

            // Throw our alert.
            attachments.push({
              fallback: 'update your client',
              color: getColor(payload.level),
              title: payload.description,
              text: 'Service: ' + payload.properties.service + '\n'
              +     'Status: ' + payload.properties.stage + '\n'
              +     'Advice: ' + payload.properties.communication,
            });
            break;

            // category.value === alert
          case 'Alert':
            context.log('Switch: ' + payload.category.value);
            text = 'Azure ' + payload.category.value + ' Alert.';

            // Throw our alert.
            attachments.push({
              fallback: 'update your client',
              color: getColor(payload.level),
              title: 'Insight Alert Received',
              text: 'Description: ' + payload.description + '\n'
              +     'Operation Type: ' + payload.properties.operationName + '\n'
              +     'Resource ID: ' + payload.properties.resourceId + '\n'
              +     'Status: ' + payload.properties.status,
            });
            break;

            // category.value === Autoscale
          case 'Autoscale':
            context.log('Switch: ' + payload.category.value);
            text = 'Azure ' + payload.category.value + ' Alert.';

            // Throw our alert.
            attachments.push({
              fallback: 'update your client',
              color: getColor(payload.level),
              title: 'Autoscale Alert Received',
              text: 'Description: ' + payload.properties.Description + '\n'
              +     'Status: ' + payload.status.value,
            });
            break;

            // !! - This value is NOT documented by MS
            // category.value === Recommendation
            //case 'Recommendation':
            //  break;
            // !!

            // category.value === Security
          case 'Security':
            context.log('Switch: ' + payload.category.value);

            //text = 'Azure ' + payload.category.value + ' Alert.';
            // Throw our alert.
            attachments.push({
              fallback: 'update your client',
              color: getColor(payload.level),
              title: 'Security Alert Received',
              text: 'Description: ' + payload.description + '\n'
              +     'Status: ' + payload.status.value,
            });
            break;

            // If we cannot determine the category.value its either NULL or something else.
            // the Administrative category also has no category.value.
          default:
            context.log.error('Could not detect category of alert in Switch');
            text = 'Unknown Azure alert category received.';
            attachments.push({
              fallback: 'update your client',
              color: 'warning',
              title: err,
              text: err + ' Payload \n' + JSON.stringify(req, null, 2),
            });
        };

      } catch (err) { // if it doesnt run then do this
        context.log.error('Caught error. Bailing.');
        text = 'Caught Azure Alert Error';
        attachments.push({
          fallback: 'update your client',
          color: 'warning',
          title: err,
          text: err + ' Payload \n' + JSON.stringify(req, null, 2),
        });
      }
    };
  } else {
    // A request body was not found
    context.log('Request body not found.');
    context.res = {
      status: 400,
      body: 'The request wasn\'t understood.',
    };
  }

  // Build our message and post it to our Slack webhook.
  var msg = {
    channel: '#ops-notices-test',
    username: 'AzureBot',
    icon_emoji: ':lightning_cloud:',
    mrkdwn: true,
    text: text,
    fallback: 'update your client',
    attachments: attachments,
  };
  context.log('Message:' + JSON.stringify(msg, null, 2));

  // and POST it
  request({
      method: 'POST',
      uri: slackUrl,
      json: true,
      body: msg,
    },
    function (error, response, body) {
      if (response.statusCode == 200) {
        context.res = {
          body: 'Posted successfully',
        };
        context.log('Posted successfully');
      } else {
        context.res = {
          status: response.statusCode,
          body: 'Error: ' + body,
        };
      }
    });

  context.done();
};
