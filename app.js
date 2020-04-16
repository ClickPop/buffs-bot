require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const {validationResult, check} = require('express-validator');
const tmi = require('./twitchBot');
const connectDB = require('./db');
const Bot = require('./schema');
app = express();
app.use(bodyParser.json());
connectDB();
const clients = [];

(async () => {
  let bots = await Bot.find();
  bots.forEach(async bot => {
    clients[bot.id] = await tmi();
    if (bot.joined === true) {
      clients[bot.id].join(bot.twitch_username);
    }
  })
})();

app.post('/', [
  check('twitch_username', 'No twitch username specified').exists(),
  check('twitch_userId', 'No twitch user id specified').exists(),
  check('buffs_userId', 'No buffs user id specified').exists(),
  check('action', 'Invalid action specified')
    .exists()
    .custom((value) => value === 'join' || value === 'part')
], async (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(422).json({errors: errors.array()});
  }

  const {
    twitch_username,
    twitch_userId,
    buffs_userId,
    action
  } = req.body;

  try {
    let bot = await Bot.findOne({twitch_username});

    if (!bot) {
      bot = new Bot({
        twitch_username,
        twitch_userId,
        buffs_userId
      });
    }
  
    if (!clients[bot.id]) {
      if (action === 'part') {
        return res.status(422).json({errors: 'Cannot part if you have not joined'});
      }
      clients[bot.id] = await tmi();
    }
  
    switch (action) {
      case 'join':
        await clients[bot.id].join(twitch_username);
        bot.joined = true;
        await bot.save();
        return res.json({status: 'success', data: bot});
      case 'part':
        await clients[bot.id].part(twitch_username);
        bot.joined = false;
        await bot.save();
        return res.json({status: 'success', data: bot});
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({errors: {error: err}})
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
});