const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ViewSchema = new Schema({
  twitch_username: {
    type: String,
    required: true,
  },
  stream: {
    type: Schema.Types.ObjectId,
    ref: 'Stream',
    required: true,
  },
  joined_at: Date,
  parted_at: Date,
});

module.exports = mongoose.model('view', ViewSchema);
