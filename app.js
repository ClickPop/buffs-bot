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
    if (bot.joined === true) {
      clients[bot.id] = await tmi();
      clients[bot.id].join(bot.twitch_username);
    }
  })
})();

app.post('/', [
  check('twitch_username', 'No twitch username specified').exists(),
  check('twitch_userId', 'No twitch user id specified').exists(),
], async (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(422).json({status: 'failure', errors: errors.array()});
  }

  try {
    const {
      twitch_username,
      twitch_userId
    } = req.body;
    
    let bot = await Bot.findOne({twitch_userId});

    if (bot) {
      return res.status(404).json({status: 'failure', errors: 'Bot already exists'});
    }

    bot = new Bot({
      twitch_username,
      twitch_userId
    });

    await bot.save();

    return res.json({status: 'success', data: {bot, created: true}});
  } catch (err) {
    console.error(err);
    res.status(500).json({status: 'failure', errors: {error: err}})
  }

})

app.put('/', [
  check('twitch_username', 'No twitch username specified').exists(),
  check('twitch_userId', 'No twitch user id specified').exists(),
  check('action', 'Invalid action specified')
    .exists()
    .custom((value) => value === 'join' || value === 'part' || value === 'updateUsername')
], async (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(422).json({status: 'failure', errors: errors.array()});
  }

  try {
    const {
      twitch_username,
      twitch_userId,
      action
    } = req.body;

    let bot = await Bot.findOne({twitch_userId});

    if (!bot) {
      return res.status(404).json({status: 'failure', errors: 'No bot found'});
    }
  
    if (!clients[bot.id]) {
      clients[bot.id] = await tmi();
    }

    if (action === 'part' && bot.joined !== true) {
      return res.status(422).json({status: 'failure', errors: 'Cannot part if you have not joined'});
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
        delete clients[bot.id];
        await bot.save();
        return res.json({status: 'success', data: bot});
      case 'updateUsername':
        bot.twitch_username = twitch_username;
        await bot.save();
        return res.json({status: 'success', data: bot});
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({status: 'failure', errors: {error: err}})
  }
});

app.delete('/', [
  check('twitch_userId', 'No twitch user id specified').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(422).json({errors: errors.array()});
  }

  try {
    const {twitch_userId} = req.body;

    let bot = await Bot.findOne({twitch_userId});
  
    if (!bot) {
      return res.status(404).json({errors: 'No user found'});
    }
    if (bot.joined === true) {
      await clients[bot.id].part(twitch_username);
      bot.joined = false;
      await bot.save();
    }
    delete clients[bot.id];
    await Bot.deleteOne({_id: bot.id});
    res.json({status: 'success', data: {bot, deleted: true}});
  } catch (err) {
    console.error(err);
    res.status(500).json({status: 'failure', errors: {error: err}})
  }

});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
});