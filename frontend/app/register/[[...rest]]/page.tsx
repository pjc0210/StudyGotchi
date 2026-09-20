import { SignUp } from "@clerk/nextjs";
import { SiteHeader } from "@/components/site/SiteHeader";
import { clerkAppearance } from "@/lib/clerkAppearance";

export default function RegisterPage() {
  return (
    <div className="login-page">
      <SiteHeader />
      <div className="login-form">
        <h1>Register</h1>
        <SignUp appearance={clerkAppearance} signInUrl="/login" fallbackRedirectUrl="/earth" />
      </div>
    </div>
  );
}
