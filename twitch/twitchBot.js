require('dotenv').config();
const Viewer = require('../db/models/Viewer');
const tmi = require('tmi.js');
const axios = require('axios');
const moment = require('moment');
const knownBots = require('../config/knownBots');
let access_token;
(async () => {
  try {
    const res = await axios.post(
      `https://id.twitch.tv/oauth2/token?client_id=${
        process.env.CLIENT_ID || ENV['CLIENT_ID']
      }&client_secret=${
        process.env.CLIENT_SECRET || ENV['CLIENT_SECRET']
      }&grant_type=client_credentials`
    );
    access_token = res.data.access_token;
  } catch (err) {
    console.error(err);
  }
  setInterval(async () => {
    try {
      const res = await axios.post(
        `https://id.twitch.tv/oauth2/token?client_id=${
          process.env.CLIENT_ID || ENV['CLIENT_ID']
        }&client_secret=${
          process.env.CLIENT_SECRET || ENV['CLIENT_SECRET']
        }&grant_type=client_credentials`
      );
      access_token = res.data.access_token;
    } catch (err) {
      console.error(err);
    }
  }, 60 * 60 * 1000);
})();

const bot = (bot_id) => {
  const client = new Promise(async (resolve, reject) => {
    const client = new tmi.client({
      options: {
        clientId: process.env.CLIENT_ID || ENV['CLIENT_ID'],
        debug: false,
      },
      connection: {
        reconnect: true,
        secure: true,
      },
      identity: {
        username: process.env.BOT_USERNAME || ENV['BOT_USERNAME'],
        password: process.env.OAUTH_TOKEN || ENV['OAUTH_TOKEN'],
      },
    });

    client.on('message', (from, context, msg, self) => {
      if (self) {
        return;
      }

      const commandName = msg.trim();
      if (commandName === '!buffs') {
        client.say(
          from,
          `@${
            context.username
          } Here is your referral link: buffs.app/r/${from.slice(1)}/${
            context.username
          }`
        );
      }
    });
    client.on('connected', (addr, port) => {
      console.log(`Client connected at ${addr}:${port}`);
    });
    client.on('disconnected', (reason) => {
      console.log('Connection closed: ', { reason });
    });
    client.on('join', async (channel, username, self) => {
      if (self) {
        console.log(`Joined ${channel}`);
        return;
      }
      if (knownBots.includes(username)) return;
      const isStreaming = await axios.get(
        `https://api.twitch.tv/helix/streams?user_login=${channel.slice(1)}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Client-ID': process.env.CLIENT_ID || ENV['CLIENT_ID'],
          },
        }
      );
      // if (isStreaming.data.data.length < 1) return;

      if (username === channel.slice(1)) return;
      let viewer = await Viewer.findOne({
        $and: [{ twitch_username: username }, { bot: bot_id }],
      });
      if (!viewer) {
        viewer = new Viewer({
          twitch_username: username,
          bot: bot_id,
        });
      }
      now = moment().utc();
      viewer.joined_at = moment().utc();
      viewer.parted_at = undefined;
      await viewer.save();
      console.log('join', now.format('HH:mm'));
    });
    client.on('part', async (channel, username, self) => {
      if (self) {
        console.log(`Parted ${channel}`);
        return;
      }
      if (knownBots.includes(username)) return;
      const isStreaming = await axios.get(
        `https://api.twitch.tv/helix/streams?user_login=${channel.slice(1)}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Client-ID': process.env.CLIENT_ID || ENV['CLIENT_ID'],
          },
        }
      );
      // if (isStreaming.data.data.length < 1) return;

      if (username === channel.slice(1)) return;
      let viewer = await Viewer.findOne({
        $and: [{ twitch_username: username }, { bot: bot_id }],
      });

      if (!viewer) return;
      const now = moment().utc();
      const then = moment(viewer.joined_at).utc();
      viewer.parted_at = now;
      viewer.watch_time = now.diff(then, 'minutes');
      await viewer.save();
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
