import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Sign in · AI Travel Planner" };
export default function Page() {
  return <Suspense><AuthForm mode="login" /></Suspense>;
}
