// Skapar testscenariot "Testjakten" i den lokala datafilen och skriver ut värdlänken.
// Kör: npm run seed

import { createTestjakten } from "../src/lib/demo";
import { mutate } from "../src/lib/store";

const base = process.env.PUBLIC_BASE_URL || "http://localhost:3000";

mutate((db) => createTestjakten(db)).then((hunt) => {
  console.log("\nTestjakten är skapad!\n");
  console.log(`Öppna som skattgömmare: ${base}/hunt/${hunt.id}/claim?key=${hunt.hostKey}`);
  console.log(`Kod för deltagare:      ${hunt.joinCode}\n`);
  process.exit(0);
});
