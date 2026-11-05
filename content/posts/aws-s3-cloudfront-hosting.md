+++
date = '2026-11-05T17:10:00+09:00'
draft = false
title = 'S3와 CloudFront로 정적 블로그 호스팅하기'
description = '비공개 S3 버킷에 사이트 파일을 두고, CloudFront만 읽을 수 있게 연결해서 HTTPS로 공개했다.'
tags = ['AWS', 'S3', 'CloudFront', '클라우드']
+++

## 오늘 배운 것

정적 웹사이트는 서버 없이 S3에 파일만 두면 된다. 다만 버킷을 인터넷에 그대로 공개하지 않고, CloudFront를 앞에 세워서 CloudFront만 버킷을 읽게 만드는 방식이 기본이다. 이 구성으로 이 블로그를 올렸다.

## 왜 필요한가

S3 버킷을 공개하면 누구나 파일을 직접 읽을 수 있고, HTTPS도 직접 쓸 수 없다. CloudFront를 앞에 두면 다음이 해결된다.

- 버킷은 비공개로 두고 CloudFront에게만 읽기 권한을 준다 (OAC, Origin Access Control).
- 기본 도메인(`*.cloudfront.net`)으로 HTTPS 접속이 된다.
- 전 세계 엣지에 캐시되어 응답이 빠르다.

```text
방문자 → CloudFront (HTTPS, 캐시) → S3 버킷 (비공개)
```

## 따라 해 보기

### 1. S3 버킷 만들기

- 리전: 서울 (`ap-northeast-2`)
- 버킷 이름은 전 세계에서 유일해야 해서 `aqua99-blog-site-2026`으로 정했다.
- **Block all public access**는 켜 둔 상태 그대로 둔다. 이 버킷은 인터넷에 공개하지 않는다.

### 2. CloudFront 배포 만들기

- Origin: 위 S3 버킷. 목록에서 고르면 `버킷이름.s3.ap-northeast-2.amazonaws.com` 형태의 주소가 들어간다. (정적 웹사이트 호스팅용 `s3-website` 주소가 아니다.)
- **Allow private S3 bucket access to CloudFront**를 체크하면 OAC가 만들어지고, CloudFront가 버킷 정책도 대신 써 준다.
- WAF는 **끔**. 정적 사이트라 입력 창이나 로그인이 없어서 막을 공격 대상이 적고, 켜면 요청 수에 따라 월 비용이 붙는다고 화면에 안내돼 있었다.

### 3. 하위 주소가 열리게 하는 CloudFront Function

CloudFront의 Default root object는 맨 첫 주소(`/`)에만 `index.html`을 붙여 준다. 그런데 Hugo는 글마다 `/posts/글이름/index.html` 구조로 파일을 만들기 때문에, `/about/` 같은 주소는 파일을 못 찾는다. 요청 주소를 바꿔 주는 작은 함수(Viewer request, `cloudfront-js-2.0`)를 연결했다.

```js
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }
  return request;
}
```

- `/about/` → `/about/index.html`
- `/about` → `/about/index.html`
- `/css/main.css`처럼 점이 있는 주소는 그대로 둔다.

함수는 만든 뒤 **Publish**까지 해야 배포에 연결할 수 있다.

## 막혔던 곳과 해결

- **리전이 시드니로 되어 있었다.** 콘솔에 들어갔을 때 오른쪽 위 리전이 Sydney였다. 그대로 두면 버킷이 엉뚱한 지역에 만들어진다. 버킷을 만들기 전에 서울로 바꿨다.
- **Default root object가 비어 있었다.** 새 CloudFront 생성 마법사에는 이 항목이 없었다. 만든 뒤 General 탭의 Edit에서 `index.html`을 넣었다.
- **설정을 바꾸면 Deploying 상태가 된다.** CloudFront는 설정을 바꿀 때마다 몇 분 동안 배포 중 상태가 된다. 바로 확인하면 예전 설정으로 보일 수 있다.

## 정리

- 정적 사이트: 비공개 S3 + CloudFront(OAC) 조합이 기본 구성이다.
- 버킷 정책은 CloudFront 배포 하나만 읽도록 제한된다.
- 하위 주소가 `index.html`로 연결되게 하려면 CloudFront Function이 필요하다.
- WAF는 정적 사이트에서는 비용 대비 효과가 작아서 껐다. 필요해지면 그때 붙인다.
- 다음 글에서는 이 버킷에 GitHub Actions로 자동 배포하는 과정을 정리한다.
