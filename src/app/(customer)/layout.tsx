export default function CustomerLayout({ children }: LayoutProps<"/">) {
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
