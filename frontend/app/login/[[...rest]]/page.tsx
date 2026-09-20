import { SignIn } from "@clerk/nextjs";
import { SiteHeader } from "@/components/site/SiteHeader";
import { clerkAppearance } from "@/lib/clerkAppearance";

export default function LoginPage() {
  return (
    <div className="login-page">
      <SiteHeader />
      <div className="login-form">
        <h1>Login</h1>
        <SignIn appearance={clerkAppearance} signUpUrl="/register" fallbackRedirectUrl="/earth" />
      </div>
    </div>
  );
}
