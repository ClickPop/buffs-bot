const Bot = require('../db/models/Bot');
const clients = require('./clients');
// Function to load all joined entries from the database into memory
// and instantiate a tmi object for each then join the user channel
const reconnect = async () => {
  let bots = await Bot.find();
  setTimeout(() => {
    bots.forEach(async (bot) => {
      if (bot.joined === true) {
        await clients.add(bot);
        await clients.join(bot.id, bot.twitch_username);
      }
    });
  }, 1000 * 15);
};

module.exports = reconnect;
