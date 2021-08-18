import { getToken } from '../utils/database';

module.exports = function() {
  return (req, res, next) => {
    const { headers } = req;
    if (!headers["authorization"] || (headers["authorization"] && !headers["authorization"].startsWith("Bearer "))) {
      return res.status(401).end(); // Invalid/Missing API Key
    } else {
      const apiKey = headers["authorization"].split("Bearer ")[1];
      getToken(apiKey).then(userId => {
        if (!userId) return res.status(401).end(); // Invalid API Key

        req.user = {};
        req.user.id = userId;
        next();
      }).catch((e) => res.status(500).end());
    }
  }
}