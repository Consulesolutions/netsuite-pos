import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Super Admin user
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@yourpos.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!';

  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      role: 'SUPER_ADMIN',
      email: superAdminEmail,
    },
  });

  if (existingSuperAdmin) {
    console.log('Super Admin already exists:', existingSuperAdmin.email);
  } else {
    const passwordHash = await bcrypt.hash(superAdminPassword, 12);

    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        tenantId: null,
        onboardingComplete: true,
        onboardingStep: 100,
      },
    });

    console.log('Created Super Admin:', superAdmin.email);
    console.log('Password:', superAdminPassword);
    console.log('\nIMPORTANT: Change the password after first login!');
  }

  // Create Plan Limits if they don't exist
  const planLimits = [
    {
      plan: 'TRIAL' as const,
      maxLocations: 1,
      maxRegisters: 1,
      maxUsers: 3,
      maxItems: 100,
      features: {
        offlineMode: false,
        reports: true,
        customerManagement: true,
        inventory: true,
        netsuiteSync: false,
      },
    },
    {
      plan: 'STARTER' as const,
      maxLocations: 1,
      maxRegisters: 2,
      maxUsers: 5,
      maxItems: 500,
      features: {
        offlineMode: false,
        reports: true,
        customerManagement: true,
        inventory: true,
        netsuiteSync: false,
      },
    },
    {
      plan: 'PROFESSIONAL' as const,
      maxLocations: 3,
      maxRegisters: 10,
      maxUsers: 20,
      maxItems: 5000,
      features: {
        offlineMode: true,
        reports: true,
        customerManagement: true,
        inventory: true,
        netsuiteSync: true,
      },
    },
    {
      plan: 'ENTERPRISE' as const,
      maxLocations: -1, // unlimited
      maxRegisters: -1,
      maxUsers: -1,
      maxItems: -1,
      features: {
        offlineMode: true,
        reports: true,
        customerManagement: true,
        inventory: true,
        netsuiteSync: true,
        customIntegrations: true,
        prioritySupport: true,
      },
    },
  ];

  for (const limit of planLimits) {
    await prisma.planLimits.upsert({
      where: { plan: limit.plan },
      update: limit,
      create: limit,
    });
    console.log(`Created/Updated plan limits for: ${limit.plan}`);
  }

  console.log('\nSeeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
