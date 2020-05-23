const View = require('../db/models/View');
const Stream = require('../db/models/Stream');
const knownBots = require('../config/knownBots');
const moment = require('moment');
const { subscribeToWebhook } = require('./webhookSubscriptions');

const buffsCommand = (client, channel, username) => {
  client.say(
    channel,
    `@${username} Here is your referral link: buffs.app/r/${channel.slice(
      1
    )}/${username}`
  );
};

const createView = async (username, isStreaming, bot_id, channel) => {
  if (!isStreaming) return;
  if (knownBots.includes(username)) return;
  if (username === channel.slice(1)) return;
  let stream = await Stream.findOne({ bot: bot_id }).sort({ started_at: -1 });
  if (!stream) return;
  let view = await View.findOne({
    $and: [{ twitch_username: username }, { stream: stream.id }],
  }).sort({ joined_at: -1 });
  if (view && !view.parted_at) return;
  view = new View({
    twitch_username: username,
    stream: stream.id,
    joined_at: moment().utc(),
  });
  await view.save();
};

module.exports = (client, channel, context, msg, self, isStreaming, bot_id) => {
  if (self) {
    return;
  }
  createView(context.username, isStreaming, bot_id, channel);
  const commandName = msg.trim();
  if (commandName === '!buffs') {
    buffsCommand(client, channel, context.username);
  }
};
