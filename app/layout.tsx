import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitMood",
  description: "Analise o humor do dev baseado nos commits do GitHub",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
