const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BotSchema = new Schema({
  twitch_username: {
    type: String,
    required: true,
  },
  twitch_userId: {
    type: String,
    required: true,
  },
  joined: {
    type: Boolean,
    required: true,
    default: false,
  },
});

module.exports = mongoose.model('bot', BotSchema);
