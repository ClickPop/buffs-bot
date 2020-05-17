const buffsCommand = (client, from, context) => {
  client.say(
    from,
    `@${context.username} Here is your referral link: buffs.app/r/${from.slice(
      1
    )}/${context.username}`
  );
};

module.exports = (client, from, context, msg, self) => {
  if (self) {
    return;
  }

  const commandName = msg.trim();
  if (commandName === '!buffs') {
    buffsCommand(client, from, context);
  }
};
