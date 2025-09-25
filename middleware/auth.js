const { verifyToken } = require("../utils/jwt");

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if(!authHeader) return res.status(401).json({ error: 'Not authorized' });

    const token = authHeader.split(' ')[1];
    if(!token) return res.status(401).json({ error: 'Invalid authorization' });

    try {
        const user = verifyToken(token, SECRET);
        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token is not valid' });
    }
}

module.exports = { authenticateToken };

