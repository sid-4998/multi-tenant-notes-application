const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const salt = bcrypt.genSaltSync(10);

async function seed() {
  const pwd = await bcrypt.hash('password', salt);

  // Acme tenant
  const acme = await prisma.tenant.upsert({
    where: { slug: 'acme' },
    update: {},
    create: { name: 'Acme', slug: 'acme', plan: 'FREE' },
  });

  // Globex tenant
  const globex = await prisma.tenant.upsert({
    where: { slug: 'globex' },
    update: {},
    create: { name: 'Globex', slug: 'globex', plan: 'FREE' },
  });

  // Acme admininistrator
  await prisma.user.upsert({
    where: { email: 'admin@acme.test' },
    update: {},
    create: {
        email: 'admin@acme.test',
        password: pwd,
        role: 'ADMIN',
        tenantId: acme.id,
    },
  });


  // Acme user
  await prisma.user.upsert({
    where: { email: 'user@acme.test' },
    update: {},
    create: {
        email: 'user@acme.test',
        password: pwd,
        role: 'MEMBER',
        tenantId: acme.id,
    },
  });

    // Globex admininistrator
    await prisma.user.upsert({
      where: { email: 'admin@globex.test' },
      update: {},
      create: {
          email: 'admin@globex.test',
          password: pwd,
          role: 'ADMIN',
          tenantId: globex.id,
      },
    });

    // Globex user
    await prisma.user.upsert({
      where: { email: 'user@globex.test' },
        update: {},
        create: {
            email: 'user@globex.test',
            password: pwd,
            role: 'MEMBER',
            tenantId: globex.id,
        },
    });

    console.log('Seeding finished.');
}

seed()
    .catch((e) => {console.error(e); process.exit(1); })
    .finally(async () => {await prisma.$disconnect(); });
