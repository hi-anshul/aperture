export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      {children}
    </main>
  );
}
