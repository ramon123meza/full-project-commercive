/**
 * Public Layout
 *
 * This layout is for pages that don't require authentication,
 * such as the affiliate form landing page.
 *
 * It simply renders children without any auth-required providers.
 * The root layout.tsx handles the HTML structure.
 */
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Just pass through children - no StoreProvider, no OnboardingProvider
  return <>{children}</>;
}
