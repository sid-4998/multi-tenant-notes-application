const express = require('express');
const router = express.Router();

const { prisma } = require('../config/prisma');          
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


// Upgrade the requesting user's personal plan (per-user plans)
// Only ADMINs may upgrade a user's plan
router.post('/:slug/upgrade', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { slug } = req.params;

    // Find tenant
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    // Ensure the requesting admin belongs to the same tenant
    if (tenant.id !== req.user.tenantId) {
      return res.status(403).json({ error: 'Cannot upgrade another tenant' });
    }

    // Upgrade only the requesting user's plan
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { plan: 'PRO' },
      select: { id: true, email: true, plan: true }
    });

    res.json({ ok: true, user: updatedUser });
  } catch (err) {
    console.error('Upgrade error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: upgrade a specific user to PRO by id or email
router.post('/:slug/upgrade-user', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { slug } = req.params;
    const { userId, email } = req.body || {};

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    if (tenant.id !== req.user.tenantId) return res.status(403).json({ error: 'Cannot modify another tenant' });

    let target;
    if (userId) target = await prisma.user.findUnique({ where: { id: userId } });
    else if (email) target = await prisma.user.findUnique({ where: { email } });
    else return res.status(400).json({ error: 'userId or email required' });

    if (!target || target.tenantId !== tenant.id) return res.status(404).json({ error: 'User not found in this tenant' });

    const updated = await prisma.user.update({ where: { id: target.id }, data: { plan: 'PRO' }, select: { id: true, email: true, plan: true } });
    res.json({ ok: true, user: updated });
  } catch (err) {
    console.error('Upgrade user error', err);
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
        users: { select: { id: true, email: true, role: true, plan: true } }
      },
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    // Ensure the requester belongs to the same tenant
    if (tenant.id !== req.user.tenantId) {
      console.log(tenant.id, req.user.tenantId);
      return res.status(403).json({ error: 'Forbidden' });
    }

    const payload = {
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      counts: tenant._count,
    }

    // include users list only for admins
    if(req.user && req.user.role === 'ADMIN'){
      payload.users = tenant.users || []
    }

    res.json(payload);
  } catch (err) {
    console.error('Tenant fetch error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;