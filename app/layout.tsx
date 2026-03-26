import type { Metadata } from "next";

const siteUrl = "https://www.asecondopinion.top";
const siteTitle = "第二双眼睛 | AI UI 评审工作台";
const siteDescription = "上传界面截图，获得真实 OpenAI 结构化评审结果与可执行优化建议。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | 第二双眼睛",
  },
  description: siteDescription,
  applicationName: "第二双眼睛",
  keywords: [
    "第二双眼睛",
    "AI UI 评审",
    "界面评审工作台",
    "可用性诊断",
    "OpenAI UI Review",
  ],
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: siteUrl,
    siteName: "第二双眼睛",
    title: siteTitle,
    description: siteDescription,
    images: ["/icon.png"],
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
    images: ["/icon.png"],
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  manifest: "/manifest.webmanifest",
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
