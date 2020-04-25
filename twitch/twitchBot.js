require('dotenv').config();
const tmi = require('tmi.js');

const bot = () => {
  const client = new Promise(async (resolve, reject) => {
    const client = new tmi.client({
      options: {
        clientId: process.env.CLIENT_ID || ENV['CLIENT_ID'],
        debug: false,
      },
      connection: {
        reconnect: true,
        // secure: true,
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
      if (commandName === '!buffs' && from.slice(1) !== context.username) {
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
    client.on('join', (channel, username, self) => {
      if (self) {
        console.log(`Joined ${channel}`);
      }
    });
    client.on('part', (channel, username, self) => {
      if (self) {
        console.log(`Parted ${channel}`);
      }
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
