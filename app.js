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

// Anonymous function to load all joined entries from the database into memory 
// and instantiate a tmi object for each then join the user channel   
(async () => {
  let bots = await Bot.find();
  bots.forEach(async bot => {
    if (bot.joined === true) {
      clients[bot.id] = await tmi();
      clients[bot.id].join(bot.twitch_username);
    }
  })
})();

// POST route to get the current status of a bot
app.post('/status', [
  check('twitch_userId', 'No twitch user id specified').exists().isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(422).json({status: 'failure', errors: errors.array()});
  }
  const {twitch_userId} = req.body;
  try {
    let bot = await Bot.findOne({twitch_userId});

    if (!bot) {
      return res.status(404).json({errors: 'No user found'});
    }

    return res.json({status: 'success', bot});
  } catch (err) {
    console.error(err);
    res.status(500).json({status: 'failure', errors: {error: err}});
  }
});

// POST route to create a bot
app.post('/', [
  check('twitch_username', 'No twitch username specified').exists().isString(),
  check('twitch_userId', 'No twitch user id specified').exists().isInt(),
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

});

// PUT route to join or part a channel or update the username of a bot 
app.put('/', [
  check('twitch_username', 'No twitch username specified').exists().isString(),
  check('twitch_userId', 'No twitch user id specified').exists().isInt(),
  check('action', 'Invalid action specified')
    .exists()
    .isString()
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
      return res.status(422).json({status: 'failure', errors: 'Already parted.'});
    } else if (action === 'join' && bot.joined !== false) {
      return res.status(422).json({status: 'failure', errors: 'Already joined.'});
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

// DELETE route to remove a bot
app.delete('/', [
  check('twitch_userId', 'No twitch user id specified').exists().isInt()
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