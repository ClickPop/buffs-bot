require('dotenv').config();
const tmi = require('tmi.js');

const bot = async () => {
  client = new tmi.client({
    options: {
      debug: false
    },
    identity: {
      username: process.env.BOT_USERNAME,
      password: process.env.OAUTH_TOKEN
    }
  });

  client.on('message', onMessageHandler);
  await client.connect();
  return client;
};

function onMessageHandler(from, context, msg, self) {
  if (self) { return; }

  const commandName = msg.trim();
  if (commandName === '!buffs') {
    // client.whisper(context.username, `Here is your referral link: buffs.app/r/${from.slice(1)}/${context.username}`)
    //   .then((data) => {
    //     // console.log(data);
    //   })
    //   .catch((err) => {
    //     // console.error(err);
    //   });
    client.say(from, `@${context.username} Here is your referral link: buffs.app/r/${from.slice(1)}/${context.username}`)
      .then((data) => {
        // console.log(data);
      })
      .catch((err) => {
        // console.error(err);
      });
  }
};

module.exports = bot;