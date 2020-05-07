const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ViewerSchema = new Schema({
  twitch_username: {
    type: String,
    required: true,
  },
  bot: {
    type: Schema.Types.ObjectId,
    ref: 'Bot',
    required: true,
  },
  watch_time: {
    type: Number,
    default: 0,
  },
  joined_at: Date,
  parted_at: Date,
});

module.exports = mongoose.model('viewer', ViewerSchema);
