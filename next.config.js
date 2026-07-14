/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Docker 배포용: .next/standalone 으로 최소 실행 번들 생성
  output: "standalone",
};

module.exports = nextConfig;
