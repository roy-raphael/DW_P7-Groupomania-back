import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Connection test
prisma.$connect()
.then(prisma.$disconnect())
.catch(error => {
    console.error(error);
    process.kill(process.pid, 'SIGTERM');
});

export default prisma