const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { authenticateToken } = require("../middleware/auth");

router.use(authenticateToken);
// All routes below this middleware are protected

// create a note
router.post("/", async (req, res) => {
    try {
        const { title, content } = req.body;

        const tenant = await prisma.tenant.findUnique({
             where: { id: req.user.tenantId },
             include: { notes: true }, 
        });
        
        if(tenant.plan === 'FREE' && tenant.notes.length >= 5) {
            return res.status(403).json({ error: 'Upgrade to PRO plan to create more notes' });
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
router.get("/", async (req, res) => {
    try {
        const notes = await prisma.note.findMany({
            where: { tenantId: req.user.tenantId },
        });
        res.status(200).json({ notes });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// get a specific note
router.get("/:id", async (req, res) => {
    try {
        const note = await prisma.note.findFirst({
            where: { id: Number(req.params.id), tenantId: req.user.tenantId },
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
router.put("/:id", async (req, res) => {
    try {
        const { title, content } = req.body;
        const note = await prisma.note.findFirst({
            where: { id: Number(req.params.id), tenantId: req.user.tenantId },
        });
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const updatedNote = await prisma.note.update({
            where: { id: Number(req.params.id), tenantId: req.user.tenantId },
            data: { title, content },
        });
        res.status(200).json({ message: "Note updated successfully", note: updatedNote });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// delete a note
router.delete("/:id", async (req, res) => {
    try {
        const note = await prisma.note.findFirst({
            where: { id: Number(req.params.id), tenantId: req.user.tenantId },
        });
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        await prisma.note.delete({
            where: { id: Number(req.params.id), tenantId: req.user.tenantId },
        });
        res.status(200).json({ message: "Note deleted successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to delete note' });
    }
}); 

module.exports = router;