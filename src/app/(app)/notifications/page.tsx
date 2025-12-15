'use client';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

// This page is no longer in use and redirects to the home page.
export default function DeprecatedNotificationsPage() {
  useEffect(() => {
    redirect('/home');
  }, []);

  return null;
}
