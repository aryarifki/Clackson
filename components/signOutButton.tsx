"use client";
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  async function handle() {
    await fetch('/api/login', { method: 'DELETE' });
    window.location.href = '/';
  }
  return <Button variant="outline" size="sm" onClick={handle}>Sign Out</Button>;
}
