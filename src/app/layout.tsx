import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { gloock, hanken } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Company A — Order direct", template: "%s · Company A" },
  description: "Hyderabadi biryani from Company A, ordered direct from our kitchens.",
};

export const viewport: Viewport = {
  themeColor: "#141312",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${gloock.variable} ${hanken.variable} antialiased`}>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "!bg-raised !text-fg !border-seam !rounded-xl !font-sans",
              description: "!text-muted",
            },
          }}
        />
      </body>
    </html>
  );
}
