const { verifyToken } = require("../utils/jwt");

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if(!authHeader) return res.status(401).json({ error: 'Not authorized' });

    const parts = authHeader.split(' ');
    if(parts.length !== 2) return res.status(401).json({ error: 'Invalid authorization header' });

    const token = parts[1];
    if(!token) return res.status(401).json({ error: 'Invalid authorization' });

    try {
        const user = verifyToken(token);
        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token is not valid' });
    }
}

module.exports = authenticateToken;

