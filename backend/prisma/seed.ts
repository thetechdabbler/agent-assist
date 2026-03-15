import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Tenant',
      slug: 'default',
    },
  });

  await prisma.user.upsert({
    where: { email: 'dev@example.com' },
    update: {},
    create: {
      email: 'dev@example.com',
      name: 'Dev User',
      tenantId: tenant.id,
    },
  });

  const httpAdapter = await prisma.pluginRegistry.upsert({
    where: {
      pluginType_pluginName: { pluginType: 'agent_adapter', pluginName: 'http' },
    },
    update: {},
    create: {
      pluginType: 'agent_adapter',
      pluginName: 'http',
      version: '1.0.0',
      contractVersion: '1.0',
      status: 'active',
    },
  });

  await prisma.tenantPlugin.upsert({
    where: {
      tenantId_pluginId: { tenantId: tenant.id, pluginId: httpAdapter.id },
    },
    update: { enabled: true, enabledAt: new Date() },
    create: {
      tenantId: tenant.id,
      pluginId: httpAdapter.id,
      enabled: true,
      enabledAt: new Date(),
    },
  });

  const echoAdapter = await prisma.pluginRegistry.upsert({
    where: {
      pluginType_pluginName: { pluginType: 'agent_adapter', pluginName: 'echo' },
    },
    update: { configJson: { displayName: 'Echo Agent' } },
    create: {
      pluginType: 'agent_adapter',
      pluginName: 'echo',
      version: '1.0.0',
      contractVersion: '1.0',
      status: 'active',
      configJson: { displayName: 'Echo Agent' },
    },
  });

  await prisma.tenantPlugin.upsert({
    where: {
      tenantId_pluginId: { tenantId: tenant.id, pluginId: echoAdapter.id },
    },
    update: { enabled: true, enabledAt: new Date() },
    create: {
      tenantId: tenant.id,
      pluginId: echoAdapter.id,
      enabled: true,
      enabledAt: new Date(),
    },
  });

  console.log(
    'Seed complete: tenant default, user dev@example.com, agent_adapter plugins (http, echo) enabled.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
