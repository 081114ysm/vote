import './globals.css';

export const metadata = {
  title: '선거 집계',
  description: '관리자 페이지와 실시간 집계 페이지',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
