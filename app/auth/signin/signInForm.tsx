'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login } from '@/app/actions/auth';
import Link from 'next/link';

export function SignInForm() {
  return (
    <form action={login} className="space-y-6">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-muted-foreground"
        >
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-muted-foreground"
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1"
        />
      </div>

      <Button type="submit" className="w-full">
        Sign In
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <Button variant="outline" className="w-full" asChild>
        <Link href="/api/auth/google/start">
          Sign In with Google
        </Link>
      </Button>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" className="font-semibold text-primary hover:underline">
          Sign Up
        </Link>
      </p>
    </form>
  );
}
