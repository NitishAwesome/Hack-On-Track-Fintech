import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgb(var(--background))' }}>
      {/* Subtle background decoration */}
      <div
        aria-hidden
        className="fixed inset-0 overflow-hidden pointer-events-none"
      >
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgb(var(--brand-500)), transparent)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgb(var(--brand-400)), transparent)' }}
        />
      </div>
      <div className="relative w-full max-w-5xl my-auto">{children}</div>
    </div>
  );
}
