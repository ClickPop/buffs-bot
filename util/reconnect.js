const Bot = require('../db/models/schema');
const clients = require('./clients');

// Function to load all joined entries from the database into memory
// and instantiate a tmi object for each then join the user channel
const reconnect = async () => {
  let bots = await Bot.find();
  bots.forEach(async (bot, index) => {
    if (bot.joined === true) {
      clients.add(bot.id);
    }
  });
};

module.exports = reconnect;
