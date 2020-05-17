const express = require('express');
const router = express.Router();
const clients = require('../util/clients');
const Bot = require('../db/models/Bot');

router.get('/', (req, res) => {
  res.send(req.query['hub.challenge']);
});

router.post('/', async (req, res) => {
  console.log(req.body.data ? true : false);
  if (req.body.data.length < 1) return res.send();
  const { data } = req.body;
  data.forEach(async (item) => {
    const { id, user_id, user_name } = item;
    const bot = await Bot.findOne({ twitch_userId: user_id });
    if (!bot) {
      console.error('Bot does not exist');
      return res.send();
    }
    const client = await clients.getBot(bot.id);
    if (!client) {
      console.error('Client does not exist');
      return res.send();
    }
    console.log(bot);
  });
  return res.send();
});

module.exports = router;
