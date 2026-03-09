export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No nav bar, no Providers wrapper — clean standalone page
  return <>{children}</>;
}
