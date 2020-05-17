require('dotenv').config();
const tmi = require('tmi.js');
const messageHandler = require('./messageHandler');
const { joinHandler, partHandler } = require('./eventHandlers');
const { resubscribeToWebhooks } = require('./webhookSubscriptions');
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
  const { id, twitch_userId, twitch_username } = bot;
  let isStreaming;
  return new Promise(async (resolve, reject) => {
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
      await joinHandler(
        self,
        channel,
        twitch_userId,
        access_token,
        isStreaming,
        username,
        id
      );
    });
    client.on('part', async (channel, username, self) => {
      await partHandler(
        self,
        channel,
        twitch_userId,
        access_token,
        isStreaming,
        username,
        id
      );
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
};
module.exports = bot;
