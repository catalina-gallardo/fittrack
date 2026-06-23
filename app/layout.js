export const metadata = {
  title: 'FitTrack',
  description: 'Your personal fitness tracker',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
