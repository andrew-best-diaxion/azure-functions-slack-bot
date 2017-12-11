module.exports = {

  //kmsEncryptedHookUrl: process.env.KMS_ENCRYPTED_HOOK_URL, // encrypted slack webhook url
  unencryptedHookUrl: process.env.SLACK_URL,    // unencrypted slack webhook url
  slackChannel: process.env.SLACK_CHANNEL,      // slack channel to send a message to
  slackUsername: process.env.SLACK_USERNAME,    // slack username to user for messages
  //icon_emoji: process.env.ICON_EMOJI,         // slack emoji icon to use for messages
  //orgIcon: process.env.ORG_ICON,              // url to icon for your organization for display in the footer of messages
  orgName: process.env.ORG_NAME,                // name of your organization for display in the footer of messages

  services: {
    operationsactivity: {
      // text in the sns message or topicname to match on to process this service type
      match_text: 'Operation',
    },

    resourcesactivity: {
      // text in the sns message or topicname to match on to process this service type
      match_text: 'Microsoft.Resources',
    },

    // codedeploy: {
    //   // text in the sns message or topicname to match on to process this service type
    //   match_text: 'CodeDeploy',
    // },
    // elasticache: {
    //   // text in the sns message or topicname to match on to process this service type
    //   match_text: 'ElastiCache',
    // },
    // autoscaling: {
    //   // text in the sns message or topicname to match on to process this service type
    //   match_text: 'AutoScaling',
    // },
  },
};
