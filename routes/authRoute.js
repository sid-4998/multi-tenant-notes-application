const express = require("express");
const router = express.Router();
const { prisma } = require("../config/prisma");
const { hashPassword, comparePassword } = require("../utils/bcrypt");
const { signToken } = require("../utils/jwt");
const authenticateToken = require('../middleware/auth');


router.post("/signup", async (req, res) => {
        try {
                
                const { email, password, name: userName, tenant: tenantName } = req.body || {};

                if (!email || !password || !userName) {
                    return res.status(400).json({ error: 'email, password and name are required' });
                }

                const existingUser = await prisma.user.findUnique({ where: { email } });
                if (existingUser) {
                        return res.status(400).json({ error: 'User already exists' });
                }

                        // Determine tenant slug/name: prefer provided `tenant` field, otherwise derive from email domain
                        const domain = (email.split('@')[1] || '').toLowerCase();
                        const derived = domain.split('.')[0] || domain || 'default';
                        const tenantFinalName = (tenantName && tenantName.toString().trim()) || derived;
                        const slugFromTenant = tenantFinalName.toLowerCase().trim();

                        // Try to find tenant by slug (slug is unique in schema)
                        let tenant = await prisma.tenant.findUnique({ where: { slug: slugFromTenant } });

                        // Option 2: bootstrap-only signup
                        // - If the tenant already exists, disallow signup and instruct the user to ask an admin to invite them
                        // - If the tenant does not exist, create it and make the first user ADMIN
                        if (tenant) {
                            return res.status(403).json({ error: 'Tenant already exists. Ask an admin to invite you to join.' });
                        }

                        // Tenant does not exist -> create it and treat this user as the tenant bootstrap admin
                        tenant = await prisma.tenant.create({ data: { name: tenantFinalName, slug: slugFromTenant } });
                        const role = 'ADMIN';

                        const hashedPassword = await hashPassword(password);

                        const user = await prisma.user.create({
                            data: {
                                email,
                                password: hashedPassword,
                                role,
                                name: userName,
                                tenantId: tenant.id,
                            },
                        });

        res.status(201).json({ message: "User created successfully", user });
    } catch (err) {
        console.error('Signup error', err);
        res.status(500).json({ error: 'Sign Up failed due to Internal server error' });
    }
});


router.post("/signin", async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ error: 'email and password required' });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Distinct response when the user doesn't exist so the frontend can
            // suggest signing up instead of showing a generic credential error.
            return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
        }

        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            // Invalid credentials for an existing user
            return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
        }

        const token = signToken({ id: user.id, email: user.email, role: user.role, tenantId: user.tenantId });
        res.status(200).json({ message: "Sign In successful", token, user });
    } catch (err) {
        console.error('SignIn error', err);
        res.status(500).json({ error: 'Sign In failed due to Internal server error' });
    }
});

// return current user info
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true, role: true, tenantId: true, plan: true, name: true } });
        if(!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    } catch(err){
        console.error('Me error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;