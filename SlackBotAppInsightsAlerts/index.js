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
};

module.exports = function (context, data) {
  var request = require('request');

  // useful to uncomment when debugging.
  context.log('=========================');
  context.log('Node.js HTTP trigger function processed a request. RequestUri=%s', data.originalUrl);
  context.log('Function was triggered with data: \n' + JSON.stringify(data, null, 2));
  var slackUrl = process.env.SLACK_URL;
  var slackChannel = process.env.SLACK_CHANNEL;

  // retrieve the environment variable from the 'App Settings' as this a kinda secret
  context.log('Slack Webhook URL: ' + slackUrl);
  context.log('Slack Channel: ' + slackChannel);

  // validate the BODY as being a valid JSON object
  // context.log('Is {}}?: ' + validator('{}')); // true JSON received
  // context.log('Is req.body valid?: ' + validator(req.body)); // true JSON not received
  //
  // // in some cases req.body comes as a valid object, sometimes as a string
  // var payload;
  // if (validator(req.body)) {
  //   payload = JSON.parse(req.body);
  //   context.log('function detected JSON being received');
  // } else {
  //   payload = req.body;
  //   context.log('function detected string being received');
  // }
  //
  // context.log('Body: ' + payload);
  // context.log('channels: ' + data.channels);

  // Build our Slack message
  // prestage some vars

  var resourceName = 'unknown';
  var text;
  var attachments = [];

  // Some debugging.
  // if (schemaId) // If schema ID is at the root of our data
  // {
  //   context.log('schemaID key detected. This is an Insights alert.');
  //   context.log('data.status is ' + data.status);
  // } else
  // {
  //   context.log('schemaID key NOT detected.');
  //   context.log('data.status is ' + data.status);
  // }

  // The schema we are passing is described at:
  // https://docs.microsoft.com/en-us/azure/monitoring-and-diagnostics/monitoring-activity-log-schema
  if (data)
  { // Do this if we have received data.
    context.log('data is not empty');

    // The Administrative category has no .value and a .channels = Operation
    if (data.category == undefined && data.channels === 'Operation')
    { // We have detected an alert of category = Administrative.
      context.log('Detected an Administrative Alert. Switch not required.');
      try // try sending a slack message for an Administrative alert.
      {
        context.log('Trying to push our Administrative Alert to Slack.');
        attachments.push({ // Throw our administrative alert.
            fallback: 'update your client',
            color: getColor(data.level),
            title: data.level,
            text: data.description + '\n'
                  + data.claims.name + ' '
                  + data.caller + ' from '
                  + data.claims.ipaddr + '\n' +
              data.properties.statusCode + ': ' + data.operationName.value + '\n' +
              'Result: ' + data.status.value,
          });
      } catch (err) // if we cannot send the administrative alert for some reason.
      {
        context.log.error('Could not push Administrative Alert to Slack.');
        attachments.push({
          fallback: 'update your client',
          color: 'warning',
          title: 'Error was: ' + err,
          text: 'Couldnt handle JSON from an Administrative alert.' + '\n'
              + 'Data received was: ' + JSON.stringify(data, null, 2),
        });
      }

    } else if (data.category == undefined)
    { // We have detected a status update from Insight Activity Logs.
      context.log('Detected Insight event. Switch not required.');
      try // try sending a slack message for an Administrative alert.
      {
        context.log('Trying to push our Insight Administrative Alert to Slack.');
        var jsonContent = JSON.parse(data.content);
        attachments.push({ // Throw our administrative alert.
            fallback: 'update your client',
            color: getColor(data.context.activityLog.level),
            title: data.context.activityLog.level,
            text: data.context.activityLog.description + '\n'
                  + data.context.activityLog.claims.name + ' '
                  + data.context.activityLog.caller + ' from '
                  + data.context.activityLog.claims.ipaddr + '\n'
                  + data.context.activityLog.properties.statusCode + ': '
                  + data.context.activityLog.operationName.value + '\n'
                  + 'Result: ' + data.status,
          });
      } catch (err) // if we cannot send the administrative alert for some reason.
      {
        context.log.error('Could not push Insight Administrative Alert to Slack.');
        attachments.push({
          fallback: 'update your client',
          color: 'warning',
          title: 'Couldnt handle JSON from an Insight Administrative alert.',
          text: 'Error was: ' + err + '\n\n'
              + 'Data received was: \n' + JSON.stringify(data, null, 2),
        });
      }

    } else
    { // Not an Administrative Category, something else. Handle via switch.
      context.log('Alert Category ' + data.category + ' Received. Switch required.');
      try // try and work out what sort of alert we received.
      {
        switch (data.category.value) { // we use a switch because its easier here.
          // category.value === Administrative
          case 'Administrative':
            context.log('Switch: ' + data.category.value);
            text = 'Azure ' + data.category.value + ' Alert.';

            // Throw our alert.
            attachments.push({
              fallback: 'update your client',
              color: getColor(data.level),
              title: data.level,
              text: data.description + '\n'
                    + data.claims.name + ' '
                    + data.caller + ' from '
                    + data.claims.ipaddr + '\n' +
                data.properties.statusCode + ': ' + data.operationName.value + '\n' +
                'Result: ' + data.status.value,
            });
            break;

          // category.value === ServiceHealth
          case 'ServiceHealth':
            context.log('Switch: ' + data.category.value);
            text = 'Azure ' + data.category.value + ' Alert.';

            // Throw our alert.
            attachments.push({
              fallback: 'update your client',
              color: getColor(data.level),
              title: data.description,
              text: 'Service: ' + data.properties.service + '\n'
              +     'Status: ' + data.properties.stage + '\n'
              +     'Advice: ' + data.properties.communication,
            });
            break;

            // category.value === alert
          case 'Alert':
            context.log('Switch: ' + data.category.value);
            text = 'Azure ' + data.category.value + ' Alert.';

            // Throw our alert.
            attachments.push({
              fallback: 'update your client',
              color: getColor(data.level),
              title: 'Insight Alert Received',
              text: 'Description: ' + data.description + '\n'
              +     'Operation Type: ' + data.properties.operationName + '\n'
              +     'Resource ID: ' + data.properties.resourceId + '\n'
              +     'Status: ' + data.properties.status,
            });
            break;

            // category.value === Autoscale
          case 'Autoscale':
            context.log('Switch: ' + data.category.value);
            text = 'Azure ' + data.category.value + ' Alert.';

            // Throw our alert.
            attachments.push({
              fallback: 'update your client',
              color: getColor(data.level),
              title: 'Autoscale Alert Received',
              text: 'Description: ' + data.properties.Description + '\n'
              +     'Status: ' + data.status.value,
            });
            break;

            // !! - This value is NOT documented by MS
            // category.value === Recommendation
            //case 'Recommendation':
            //  break;
            // !!

            // category.value === Security
          case 'Security':
            context.log('Switch: ' + data.category.value);

            //text = 'Azure ' + data.category.value + ' Alert.';
            // Throw our alert.
            attachments.push({
              fallback: 'update your client',
              color: getColor(data.level),
              title: 'Security Alert Received',
              text: 'Description: ' + data.description + '\n'
              +     'Status: ' + data.status.value,
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
      } catch (err) // if we couldnt work out what sort of alert it was.
      {
        context.log.error('Could not determine the Alert category in Switch and the Default failed.');
        context.log.error('Could not push Administrative Alert to Slack.');
        attachments.push({
          fallback: 'update your client',
          color: 'warning',
          title: 'Error was: ' + err,
          text: 'Couldnt handle JSON from an Unknown alert alert category.' + '\n'
              + 'Data received was: ' + JSON.stringify(data, null, 2),
        });

        // handle this error with this
      }
    };

    // try { // we build and send our alert
    //   text = 'Azure Alert';
    //   attachments.push({
    //     fallback: 'update your client',
    //     color: getColor(data.category.value),
    //     title: data.category.value + ' Alert',
    //     text: 'Operation: ' + data.operationName.localizedValue + '\n'
    //         + 'Target Resource: ' + data.resourceId + '\n'
    //         + 'Performed By: ' + data.caller + '\n'
    //         + 'Result: ' + data.status.value,
    //   });
    // } catch (err) { // if we couldnt send our alert.
    //   context.log.error('Could not post message to slack API.');
    //   //text = 'Caught Error raising alert from Azure.';
    //   attachments.push({
    //     fallback: 'update your client',
    //     color: 'warning',
    //     title: 'Error posting to slack was: ' + err,
    //     text: 'Data received was: ' + JSON.stringify(data, null, 2),
    //   });
    // }
  } else
  { // If data doesnt exist then send this message.
    context.log.error('data is empty');
    text = 'Could not find data in message from Azure Monitor.';
    attachments.push({
      fallback: 'update your client',
      color: 'warning',
      title: 'Error',
      text: 'Payload does not have data \n' + JSON.stringify(data, null, 2),
    });
  }

  var msg = {
    channel: slackChannel,

    // username: 'testbot',
    // icon_emoji: ':lightning_cloud:',
    mrkdwn: true,
    text: text,
    fallback: 'update your client',
    attachments: attachments,
  };

  //context.log('Message:' + JSON.stringify(msg, null, 2));
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
