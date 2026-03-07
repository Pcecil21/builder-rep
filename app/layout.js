import "@/src/styles.css";

export const metadata = {
  title: "Builder Rep",
  description: "Create and publish a shareable AI-native builder representative.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
