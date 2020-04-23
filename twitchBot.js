require('dotenv').config();
const tmi = require('tmi.js');
const reconnect = require('./app');

const bot = async () => {
  client = new tmi.client({
    options: {
      clientId: process.env.CLIENT_ID,
      debug: false,
    },
    connection: {
      reconnect: true,
      // secure: true,
    },
    identity: {
      username: process.env.BOT_USERNAME,
      password: process.env.OAUTH_TOKEN,
    },
  });

  client.on('message', onMessageHandler);
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
  client.on('reconnect', reconnect(true));
  client.on('part', (channel, username, self) => {
    if (self) {
      console.log(`Parted ${channel}`);
    }
  });
  await client.connect();
  return client;
};

function onMessageHandler(from, context, msg, self) {
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
}

module.exports = bot;
