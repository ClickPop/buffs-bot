const tmi = require('../twitch/twitchBot');
const clients = [];

const add = async (id, username, twitch_id) => {
  clients[id] = await tmi();
};

const join = (id, username) => {
  const data = new Promise((resolve, reject) => {
    clients[id]
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
    clients[id]
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
    clients[id]
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

const getReadyState = (id) => {
  return clients[id].readyState();
};

const getBot = (id) => {
  return clients[id];
};

module.exports = {
  add,
  join,
  part,
  remove,
  getReadyState,
  getBot,
};
