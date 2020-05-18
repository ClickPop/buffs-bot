const View = require('../db/models/View');
const Stream = require('../db/models/Stream');
const moment = require('moment');
const knownBots = require('../config/knownBots');
const {
  subscribeToWebhook,
  unsubscribeFromWebhook,
} = require('./webhookSubscriptions');

const joinHandler = async (
  self,
  channel,
  twitch_userId,
  access_token,
  isStreaming,
  username,
  id
) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (self) {
        console.log(`Joined ${channel}`);
        await subscribeToWebhook(twitch_userId, access_token);
        return;
      }
      if (!isStreaming) return;
      if (knownBots.includes(username)) return;
      if (username === channel.slice(1)) return;
      let stream = await Stream.findOne({ bot: id }).sort({ started_at: -1 });
      if (!stream) return;
      let view = await View.findOne({
        $and: [{ twitch_username: username }, { stream: stream.id }],
      });
      if (view) return;
      view = new View({
        twitch_username: username,
        stream: stream.id,
        joined_at: moment().utc(),
      });
      await view.save();
      resolve();
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
};

const partHandler = (
  self,
  channel,
  twitch_userId,
  access_token,
  isStreaming,
  username,
  id
) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (self) {
        console.log(`Parted ${channel}`);
        await unsubscribeFromWebhook(twitch_userId, access_token);
        return;
      }
      if (!isStreaming) return;
      if (knownBots.includes(username)) return;
      if (username === channel.slice(1)) return;
      let stream = await Stream.findOne({ bot: id }).sort({ started_at: -1 });
      if (!stream) return;
      let view = await View.findOne({
        $and: [{ twitch_username: username }, { stream: stream.id }],
      });
      if (!view) return;
      view.parted_at = view.stream.ended_at
        ? view.stream.ended_at
        : moment().utc();
      await view.save();
      resolve();
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
};

module.exports = { joinHandler, partHandler };
