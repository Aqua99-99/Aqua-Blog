export const profile = {
  name: "황준현",
  affiliation: "영남이공대학교 사이버보안과 · 2학년",
  tagline: "클라우드 보안을 공부하며, 배운 것과 막힌 곳을 그대로 기록합니다.",
  email: "dkzndk1223@gmail.com",
  github: "https://github.com/Aqua99-99",
  education: [{ school: "영남이공대학교", major: "사이버보안과", period: "2025.03 – 재학 중" }],
};

export interface Project { name: string; summary: string; repo: string; live: string | null }

export const projects: Project[] = [
  {
    name: "한 해 가계부",
    summary: "캘린더와 도넛 차트로 한 해의 수입·지출을 한눈에 보는 웹 가계부.",
    repo: "https://github.com/Aqua99-99/Hanhae-Gagyebu",
    live: "https://hanhae-gagyebu.vercel.app",
  },
  {
    name: "이 블로그",
    summary: "노션에 쓴 내용을 Astro로 빌드해 GitHub Pages에 올린다. 처음에는 Hugo와 AWS S3·CloudFront로 직접 배포했다.",
    repo: "https://github.com/Aqua99-99/Aqua-Blog",
    live: null,
  },
];
