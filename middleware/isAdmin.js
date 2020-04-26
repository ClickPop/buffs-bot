require('dotenv').config();
const admins = require('../config/admins');
const isAdmin = (req, res, next) => {
  if (admins.includes(req.auth)) {
    req.admin = true;
    next();
  } else {
    return res.status(401).json({ error: { errors: 'Unauthorized' } });
  }
};

module.exports = isAdmin;
