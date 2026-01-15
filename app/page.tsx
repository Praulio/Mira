import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function Home() {
  const { userId } = await auth()

  // Redirect authenticated users to dashboard
  if (userId) {
    redirect("/dashboard")
  }

  // Redirect unauthenticated users to sign-in
  redirect("/sign-in")
}
