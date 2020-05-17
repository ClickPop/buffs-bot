const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StreamSchema = new Schema({
  twitch_streamId: {
    type: String,
    required: true,
  },
  bot: {
    type: Schema.Types.ObjectId,
    ref: 'Bot',
    required: true,
  },
  started_at: Date,
  ended_at: Date,
});

module.exports = mongoose.model('stream', StreamSchema);
