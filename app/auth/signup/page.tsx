export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { SignUpForm } from './signUpForm';

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Create an Account</h1>
          <p className="text-muted-foreground">
            Sign up to start using Clackson
          </p>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
