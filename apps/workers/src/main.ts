import { prisma } from "@myheritage/db";

async function relayOnce() {
  const batch = await prisma.eventOutbox.findMany({
    where: { status: "pending", availableAt: { lte: new Date() } },
    take: 20,
    orderBy: { createdAt: "asc" },
  });

  for (const event of batch) {
    try {
      const payload = JSON.parse(event.payloadJson) as {
        notifyAccountId?: string;
        title?: string;
        body?: string;
        studentIds?: string[];
        type?: string;
      };

      if (event.eventName === "GradeItem.published") {
        const students = await prisma.student.findMany({
          where: {
            institutionId: event.institutionId,
            id: { in: payload.studentIds ?? [] },
          },
          include: { person: { include: { accounts: true } } },
        });
        for (const student of students) {
          const account = student.person.accounts[0];
          if (!account) continue;
          await prisma.notification.create({
            data: {
              institutionId: event.institutionId,
              recipientAccountId: account.id,
              channel: "in_app",
              title: "Grade published",
              body: "A new grade is available in MyHeritage.",
              templateKey: "grade.published",
            },
          });
        }
      }

      if (event.eventName === "Message.sent" && payload.notifyAccountId) {
        await prisma.notification.create({
          data: {
            institutionId: event.institutionId,
            recipientAccountId: payload.notifyAccountId,
            channel: "in_app",
            title: payload.title ?? "New message",
            body: payload.body ?? "",
            templateKey: "message.received",
          },
        });
      }

      await prisma.eventOutbox.update({
        where: { id: event.id },
        data: { status: "delivered", attempts: { increment: 1 } },
      });
    } catch (err) {
      console.error("outbox failed", event.id, err);
      await prisma.eventOutbox.update({
        where: { id: event.id },
        data: { status: "pending", attempts: { increment: 1 }, availableAt: new Date(Date.now() + 15_000) },
      });
    }
  }
  return batch.length;
}

async function main() {
  console.log("MyHeritage workers: outbox relay started");
  for (;;) {
    const n = await relayOnce();
    if (n === 0) await new Promise((r) => setTimeout(r, 1500));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
