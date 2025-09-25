const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { hashPassword } = require("../utils/bcrypt");
const { comparePassword } = require("../utils/bcrypt");
const { signToken } = require("../utils/jwt");


router.post("/signup", async (req, res) => {
    try{
        const { email, password, name } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if(existingUser){
            return res.status(400).json({ error: 'User already exists' });
        }

        let tenant = await prisma.tenant.findFirst({ where: { name: name } });
        if(!tenant) {
            tenant = await prisma.tenant.create({ data: { name: name } });
        }

        const hashedPassword = hashPassword(password);

        const user = await prisma.user.create({ 
            data: {
                email,
                password: hashedPassword,
                role,
                name,
                tenantId: tenant.id
            },
        });

        res.status(201).json({message: "User created successfully", user});
    }
    catch(err){
        console.log(err);
        res.status(500).json({ error: 'Sign Up failed due to Internal server error' });
    }

});

router.post("/signin", async (req, res) => {
    try{
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if(!user){
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const isPasswordValid = await comparePassword(password, user.password);
        if(!isPasswordValid){
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const token = signToken({ id: user.id, email: user.email, role: user.role, tenantId: user.tenantId });
        res.status(200).json({ message: "Sign In successful", token, user });
    }
    catch(err){
        console.log(err);
        res.status(500).json({ error: 'Sign In failed due to Internal server error' });
    }
});

module.exports = router;