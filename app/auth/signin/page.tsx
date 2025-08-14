import { SignInForm } from './signInForm';

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in to continue to Clackson
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}
