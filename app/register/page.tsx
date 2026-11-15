import { redirect } from "next/navigation";

/**
 * Demo: there are no real accounts to create, so sign-up sends visitors to
 * the login page and its "Try demo" button.
 */
export default function RegisterRoute() {
  redirect("/login");
}
