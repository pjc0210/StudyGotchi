import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-toy-sky px-6">
      <SignIn />
    </main>
  );
}
