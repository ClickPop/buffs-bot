const tmi = require('../twitch/twitchBot');
const clients = [];

const add = async (bot) => {
  const client = new Promise(async (resolve, reject) => {
    try {
      clients[bot.id] = await tmi(bot);
      resolve(clients[bot.id]);
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
  return client;
};

const join = (id, username) => {
  const data = new Promise((resolve, reject) => {
    clients[id].client
      .join(username)
      .then((data) => {
        resolve(data);
      })
      .catch((err) => {
        console.error(err);
        reject(err);
      });
  });
  return data;
};

const part = (id, username) => {
  const data = new Promise((resolve, reject) => {
    clients[id].client
      .part(username)
      .then((data) => {
        resolve(data);
      })
      .catch((err) => {
        console.error(err);
        reject(err);
      });
  });
  return data;
};

const remove = (id) => {
  const data = new Promise((resolve, reject) => {
    clients[id].client
      .disconnect()
      .then((data) => {
        delete clients[id];
        resolve({ deleted: true, data });
      })
      .catch((err) => {
        console.error(err);
        reject(err);
      });
  });
  return data;
};

const getBot = (id) => {
  return clients[id];
};

const setStreamStatus = (id, status) => {
  clients[id].setStream(status);
};

getStreamStatus = (id) => {
  return clients[id].isStreaming();
};

module.exports = {
  add,
  join,
  part,
  remove,
  getBot,
  setStreamStatus,
  getStreamStatus,
};
