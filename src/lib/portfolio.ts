import fixtures from "../fixtures/portfolio.json";
import { loadPortfolio, type PortfolioItem } from "./notion";
import type { NotionApi } from "./notion/client";
import { withBase } from "./paths";

export interface SourceEnv {
  NOTION_TOKEN?: string;
  NOTION_DATA_SOURCE_ID?: string;
  /** "1" 이면 노션 대신 예시 데이터를 쓴다. 시험과 로컬 미리보기 전용. */
  PORTFOLIO_FIXTURES?: string;
  DEV: boolean;
}

/** 포트폴리오를 어디서 읽을지 정한다. 배포 빌드에서 비밀값이 없으면 실패한다. */
export function resolveSource(env: SourceEnv): "notion" | "fixtures" {
  if (env.PORTFOLIO_FIXTURES === "1") return "fixtures";
  if (env.NOTION_TOKEN && env.NOTION_DATA_SOURCE_ID) return "notion";
  if (env.DEV) return "fixtures";
  const missing = !env.NOTION_TOKEN ? "NOTION_TOKEN" : "NOTION_DATA_SOURCE_ID";
  throw new Error(`환경 변수 ${missing} 이 없습니다. 노션을 읽을 수 없어 빌드를 멈춥니다.`);
}

/**
 * 내려받은 파일을 둘 곳. 빌드에서는 public/ 이 페이지를 만들기 전에 복사되므로
 * 결과물 폴더에 바로 쓴다. 개발 서버는 public/ 을 그대로 내보낸다.
 */
export function assetOutDir(dev: boolean): string {
  return dev ? "public/notion" : "dist/notion";
}

let cached: Promise<PortfolioItem[]> | undefined;

/** 공개된 포트폴리오 항목. 빌드 한 번에 노션을 한 번만 읽는다. */
export function getPortfolio(): Promise<PortfolioItem[]> {
  cached ??= load();
  return cached;
}

async function load(): Promise<PortfolioItem[]> {
  const env = { ...process.env, DEV: import.meta.env.DEV } as SourceEnv;
  if (resolveSource(env) === "fixtures") {
    return (fixtures as PortfolioItem[]).map((item) => ({ ...item, proofUrls: item.proofUrls.map((u) => withBase(u)) }));
  }
  // CommonJS 패키지라 이름 붙은 내보내기가 빌드 환경에 따라 default 안에 들어온다.
  const sdk = (await import("@notionhq/client")) as any;
  const Client = sdk.Client ?? sdk.default.Client;
  const api = new Client({ auth: env.NOTION_TOKEN }) as NotionApi;
  return loadPortfolio({ api, dataSourceId: env.NOTION_DATA_SOURCE_ID!, outDir: assetOutDir(import.meta.env.DEV), publicPrefix: withBase("/notion/") });
}
