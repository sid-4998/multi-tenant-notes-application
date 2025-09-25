const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { hashPassword } = require("../utils/bcrypt");


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

module.exports = { router };