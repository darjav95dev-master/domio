/**
 * AuthLayout — transparent passthrough.
 *
 * Full-screen layout (the panel) and self-centering pages (login) manage their
 * own container, so this layout must NOT center or width-constrain its children;
 * doing so would shrink the whole /panel/* area to its content width instead of
 * letting it fill the screen.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
