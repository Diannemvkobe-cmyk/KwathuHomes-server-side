/*
Purpose
- Protects routes by checking for a valid login token (JWT).
- If the token is valid, it adds the user info to the request and continues.

How It Works
- Looks for an “Authorization” header like: Bearer <token>.
- Verifies the token using a secret value stored in an environment file.
- On success, sets “req.user” so other code knows who is making the request.
- On failure, stops the request and responds with “401 Unauthorized”.

Where It Fits
- Used by routes that require the user to be logged in (e.g., properties).
*/
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET 

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
