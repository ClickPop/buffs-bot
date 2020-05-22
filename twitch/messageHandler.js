const buffsCommand = (client, channel, username) => {
  client.say(
    channel,
    `@${username} Here is your referral link: buffs.app/r/${channel.slice(
      1
    )}/${username}`
  );
};

module.exports = (client, channel, context, msg, self, isStreaming, bot_id) => {
  if (self) {
    return;
  }
  const commandName = msg.trim();
  if (commandName === '!buffs') {
    buffsCommand(client, channel, context.username);
  }
};
