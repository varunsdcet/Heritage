const locks = new Map<string, Promise<unknown>>();

/** Serialises money movements per student (single API process) so two concurrent requests cannot both pass a refundable check. */
export async function withStudentMoneyLock<T>(institutionId: string, studentId: string, run: () => Promise<T>): Promise<T> {
  const key = `${institutionId}:${studentId}`;
  const next = (locks.get(key) ?? Promise.resolve()).catch(() => undefined).then(run);
  const tail = next.catch(() => undefined);
  locks.set(key, tail);
  try {
    return await next;
  } finally {
    if (locks.get(key) === tail) locks.delete(key);
  }
}
