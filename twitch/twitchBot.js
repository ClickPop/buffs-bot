require('dotenv').config();
const View = require('../db/models/View');
const Stream = require('../db/models/Stream');
const tmi = require('tmi.js');
const moment = require('moment');
const knownBots = require('../config/knownBots');
const messageHandler = require('./messageHandler');
const {
  subscribeToWebhook,
  unsubscribeFromWebhook,
  resubscribeToWebhooks,
} = require('./webhookSubscriptions');
const getAccessToken = require('../util/getTwitchAccessToken');
let access_token;
(async () => {
  access_token = await getAccessToken();
  // await resubscribeToWebhooks(access_token);
  setInterval(async () => {
    access_token = await getAccessToken();
  }, 60 * 60 * 1000);
  setInterval(async () => {
    // await resubscribeToWebhooks(access_token);
  }, 604800 * 1000);
})();
const bot = async (bot) => {
  const { id, twitch_userId } = bot;
  const username = bot.twitch_username;
  let stream;
  let isStreaming;
  const client = new Promise(async (resolve, reject) => {
    const client = new tmi.client({
      options: {
        clientId: process.env.BUFFS_CLIENT_ID || ENV['BUFFS_CLIENT_ID'],
        debug: false,
      },
      connection: {
        reconnect: true,
        secure: true,
      },
      identity: {
        username: process.env.BOT_USERNAME || ENV['BOT_USERNAME'],
        password: process.env.BUFFS_OAUTH_TOKEN || ENV['BUFFS_OAUTH_TOKEN'],
      },
    });

    client.on('message', (from, context, msg, self) => {
      messageHandler(client, from, context, msg, self);
    });
    client.on('connected', async (addr, port) => {
      console.log(`Client connected at ${addr}:${port}`);
    });
    client.on('disconnected', (reason) => {
      console.log('Connection closed: ', { reason });
    });
    client.on('join', async (channel, username, self) => {
      if (self) {
        console.log(`Joined ${channel}`);
        await subscribeToWebhook(twitch_userId, access_token);
        return;
      }
      if (!isStreaming) return;
      if (knownBots.includes(username)) return;
      if (username === channel.slice(1)) return;
      let view = await View.findOne({
        $and: [
          { twitch_username: username },
          { bot: id },
          { stream: stream.id },
        ],
      });
      if (!view) {
        view = new View({
          twitch_username: username,
          bot: id,
          stream: stream.id,
        });
      }
      now = moment().utc();
      view.joined_at = moment().utc();
      view.parted_at = undefined;
      await view.save();
      console.log('join', now.format('HH:mm'));
    });
    client.on('part', async (channel, username, self) => {
      if (self) {
        console.log(`Parted ${channel}`);
        await unsubscribeFromWebhook(twitch_userId, access_token);
        return;
      }
      if (!isStreaming) return;
      if (knownBots.includes(username)) return;
      if (username === channel.slice(1)) return;
      let view = await View.findOne({
        $and: [
          { twitch_username: username },
          { bot: id },
          { stream: stream.id },
        ],
      }).populate('stream');

      if (!view) return;
      let now;
      if (view.stream.ended_at) {
        now = view.stream.ended_at;
      } else {
        now = moment().utc();
      }
      view.parted_at = now;
      await view.save();
      console.log('part', now.format('HH:mm'));
    });
    await client
      .connect()
      .then((data) => {
        resolve(client);
      })
      .catch((err) => {
        console.error(err);
        reject(err);
      });
  });
  return client;
};
module.exports = bot;
