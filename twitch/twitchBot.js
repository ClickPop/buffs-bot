require('dotenv').config();
const View = require('../db/models/View');
const Stream = require('../db/models/Stream');
const tmi = require('tmi.js');
const axios = require('axios');
const moment = require('moment');
const knownBots = require('../config/knownBots');
let access_token;
(async () => {
  try {
    const res = await axios.post(
      `https://id.twitch.tv/oauth2/token?client_id=${
        process.env.CLIENT_ID || ENV['BUFFS_CLIENT_ID']
      }&client_secret=${
        process.env.CLIENT_SECRET || ENV['BUFFS_CLIENT_SECRET']
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
          process.env.CLIENT_ID || ENV['BUFFS_CLIENT_ID']
        }&client_secret=${
          process.env.CLIENT_SECRET || ENV['BUFFS_CLIENT_SECRET']
        }&grant_type=client_credentials`
      );
      access_token = res.data.access_token;
    } catch (err) {
      console.error(err);
    }
  }, 60 * 60 * 1000);
})();

const bot = async (bot) => {
  const { id } = bot;
  const username = bot.twitch_username;
  let stream;
  let twitch_streamId;
  let isStreaming = false;
  let stream_data;
  setInterval(async () => {
    try {
      stream_data = await axios.get(
        `https://api.twitch.tv/helix/streams?user_login=${username}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Client-ID': process.env.CLIENT_ID || ENV['CLIENT_ID'],
          },
        }
      );
      stream = await Stream.find({ twitch_streamId });
      if (stream_data.data.data.length > 0) {
        twitch_streamId = stream_data.data.data.id;
        if (!stream) {
          stream = new Stream({
            twitch_streamId,
            bot: id,
            started_at: stream_data.data.data.started_at,
          });
        }
        isStreaming = true;
      } else if (stream_data.data.data.length < 1 && stream) {
        stream.ended_at = moment().utc();
        stream.stream_length = moment()
          .utc()
          .diff(moment(stream.started_at).utc(), 'minutes');
        await stream.save;
        isStreaming = false;
        stream = undefined;
      }
    } catch (err) {
      console.error(err);
    }
  }, 1000 * 60 * 5);
  const client = new Promise(async (resolve, reject) => {
    const client = new tmi.client({
      options: {
        clientId: process.env.CLIENT_ID || ENV['BUFFS_CLIENT_ID'],
        debug: false,
      },
      connection: {
        reconnect: true,
        secure: true,
      },
      identity: {
        username: process.env.BOT_USERNAME || ENV['BOT_USERNAME'],
        password: process.env.OAUTH_TOKEN || ENV['BUFFS_OAUTH_TOKEN'],
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
      if (!isStreaming) return;

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
        return;
      }
      if (!isStreaming) return;

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
