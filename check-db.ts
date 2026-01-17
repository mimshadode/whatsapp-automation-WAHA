import prisma from './lib/db';

async function main() {
  const sessions = await prisma.whatsappSession.findMany({
    include: {
      conversations: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });

  console.log('--- DATABASE STATE ---');
  console.log('Total Sessions:', sessions.length);
  
  sessions.forEach(s => {
    console.log(`\nSession: ${s.phoneNumber}`);
    console.log(`Last Activity: ${s.updatedAt}`);
    console.log('Recent Messages:');
    s.conversations.forEach(c => {
      console.log(`- [${c.messageType}] ${c.messageContent}`);
    });
  });
  
  process.exit(0);
}

main();
