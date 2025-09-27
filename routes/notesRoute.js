const express = require("express");
const router = express.Router();
const { prisma } = require("../config/prisma");
const authenticateToken = require("../middleware/auth");

// create a note
router.post("/", authenticateToken, async (req, res) => {
    try {
        const { title, content } = req.body;

        // Check the requesting user's plan and their note count
        const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { Authored: true } });
        if(!user) return res.status(404).json({ error: 'User not found' });

        if(user.plan === 'FREE' && user.Authored.length >= 3) {
            return res.status(403).json({ error: 'Upgrade to PRO plan to create more notes', code: 'PLAN_LIMIT_REACHED' });
        }

        const note = await prisma.note.create({
            data: {
                title,
                content,
                authorId: req.user.id,
                tenantId: req.user.tenantId
            },
        });
        res.status(201).json({ message: "Note created successfully", note });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

// get all notes for the tenant
router.get("/", authenticateToken, async (req, res) => {
    try {
        // Only return notes authored by the current user (even within the same tenant)
        const notes = await prisma.note.findMany({
            where: { tenantId: req.user.tenantId, authorId: req.user.id },
        });
        res.status(200).json({ notes });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// get a specific note
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const note = await prisma.note.findFirst({
            where: { id: Number(req.params.id), tenantId: req.user.tenantId, authorId: req.user.id },
        });
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.status(200).json({ note });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to fetch note' });
    }
});

// update a note
router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const { title, content } = req.body;
        // ensure the note exists and belongs to the current user
        const note = await prisma.note.findFirst({
            where: { id: Number(req.params.id), tenantId: req.user.tenantId, authorId: req.user.id },
        });
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const updatedNote = await prisma.note.update({
            where: { id: Number(req.params.id) },
            data: { title, content },
        });
        res.status(200).json({ message: "Note updated successfully", note: updatedNote });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// delete a note
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        // verify ownership first
        const note = await prisma.note.findFirst({
            where: { id: Number(req.params.id), tenantId: req.user.tenantId, authorId: req.user.id },
        });
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        await prisma.note.delete({ where: { id: Number(req.params.id) } });
        res.status(200).json({ message: "Note deleted successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to delete note' });
    }
}); 

module.exports = router;