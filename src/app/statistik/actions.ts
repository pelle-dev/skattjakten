"use server";

// Inloggning till statistiksidan. Lösenordet sätts som miljövariabeln STATISTIK_LOSENORD i Vercel.

import { redirect } from "next/navigation";
import { clientKey, sameSecret } from "@/lib/session";
import { hit } from "@/lib/store";
import { setStatsCookie, statsPassword } from "./access";

export async function logIn(formData: FormData) {
  const given = formData.get("losenord");
  // Högst 10 försök per kvart från samma ställe, så att lösenordet inte kan gissas.
  if (!(await hit(`stats:${await clientKey()}`, 10, 15 * 60))) redirect("/statistik?fel=manga");
  if (typeof given !== "string" || !sameSecret(given, statsPassword())) redirect("/statistik?fel=losenord");
  await setStatsCookie();
  redirect("/statistik");
}
