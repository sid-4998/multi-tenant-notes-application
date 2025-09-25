const express = require('express');
const router = express.Router();

const prisma = require('../config/prisma');          
const authenticateToken = require('../middleware/auth');       
const requireRole = require('../middleware/role');
const { hashPassword } = require('../utils/bcrypt'); 



router.post('/:slug/invite', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { slug } = req.params;
    const { email, role = 'MEMBER', password = 'password' } = req.body;

    // Find the tenant by slug
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    // Ensure the requesting admin belongs to the same tenant
    if (tenant.id !== req.user.tenantId) {
      return res.status(403).json({ error: 'Cannot invite users for another tenant' });
    }

    // Prevent creating or moving an existing user by email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'A user with that email already exists' });
    }

    // Hash the provided password
    const hashed = await hashPassword(password);

    // Create the new user tied to this tenant
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        role,
        tenantId: tenant.id,
      },
      select: { id: true, email: true, role: true },
    });

    res.status(201).json({ ok: true, user });
  } catch (err) {
    console.error('Invite error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/:slug/upgrade', authenticateToken,requireRole('ADMIN'), async (req, res) => {
  try {
    const { slug } = req.params;

    // Find tenant
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    // Ensure the requesting admin belongs to the same tenant
    if (tenant.id !== req.user.tenantId) {
      return res.status(403).json({ error: 'Cannot upgrade another tenant' });
    }

    // Update plan to PRO
    const updated = await prisma.tenant.update({
      where: { slug },
      data: { plan: 'PRO' },
    });

    res.json({ ok: true, tenant: { slug: updated.slug, plan: updated.plan } });
  } catch (err) {
    console.error('Upgrade error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true, slug: true, name: true, plan: true,
        _count: { select: { users: true, notes: true } },
      },
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    // Ensure the requester belongs to the same tenant
    if (tenant.id !== req.user.tenantId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      counts: tenant._count,
    });
  } catch (err) {
    console.error('Tenant fetch error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
