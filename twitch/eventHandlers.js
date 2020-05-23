const View = require('../db/models/View');
const Stream = require('../db/models/Stream');
const moment = require('moment');
const knownBots = require('../config/knownBots');
const {
  subscribeToWebhook,
  unsubscribeFromWebhook,
} = require('./webhookSubscriptions');
const asyncForEach = require('../util/asyncForEach');
const axios = require('axios');

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
        if (isStreaming) {
          let stream = await Stream.findOne({ bot: id }).sort({
            started_at: -1,
          });
          if (!stream) return;
          const views = View.find({
            stream: stream.id,
            parted_at: { $exists: false },
          });
          const response = await axios.get(
            `https://tmi.twitch.tv/group/user/${channel.slice(1)}/chatters`
          );
          const chatters = [];
          const viewers = response.data.chatters;
          for (const viewer_type in viewers) {
            if (viewer_type === 'broadcaster') break;
            viewers[viewer_type].forEach((viewer) => {
              if (!knownBots.includes(viewer)) {
                chatters.push(viewer);
              }
            });
          }
          const views_names = views.map((view) => view.twitch_username);
          asyncForEach(chatters, async (chatter) => {
            if (!views_names.includes(chatter)) {
              const view = new View({
                twitch_username: viewer,
                stream: stream.id,
                joined_at: moment().utc(),
              });
              await view.save();
            }
          });
        }
        return;
      }
      if (!isStreaming) return;
      if (knownBots.includes(username)) return;
      if (username === channel.slice(1)) return;
      let stream = await Stream.findOne({ bot: id }).sort({ started_at: -1 });
      if (!stream) return;
      console.log(`${username} joined ${channel}`);
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
        let stream = await Stream.findOne({ bot: id }).sort({ started_at: -1 });
        if (!stream) return;
        let views = await View.find({
          stream: stream.id,
          parted_at: { $exists: false },
        });
        if (!views) return;
        await asyncForEach(views, async (view) => {
          view.parted_at = stream.ended_at ? stream.ended_at : moment().utc();
          await view.save();
        });
        return;
      }
      if (knownBots.includes(username)) return;
      if (username === channel.slice(1)) return;
      let stream = await Stream.findOne({ bot: id }).sort({ started_at: -1 });
      if (!stream) return;
      console.log(`${username} parted ${channel}`);
      let view = await View.findOne({
        $and: [
          { twitch_username: username },
          { stream: stream.id },
          { parted_at: { $exists: false } },
        ],
      }).sort({ joined_at: -1 });
      if (!view) return;
      view.parted_at = stream.ended_at ? stream.ended_at : moment().utc();
      await view.save();
      resolve();
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
};

module.exports = { joinHandler, partHandler };
