---
title: "GitHub Actions와 OIDC로 AWS에 자동 배포하기"
description: "액세스 키 없이, GitHub이 보내는 신원 정보로 AWS 임시 권한을 받아 S3에 배포했다. 신뢰 정책 sub 값이 달라서 막혔던 과정도 적었다."
date: 2026-11-05T17:20:00+09:00
tags: ["AWS", "IAM", "GitHub Actions", "OIDC", "클라우드"]
draft: false
---

## 오늘 배운 것

GitHub Actions가 AWS에 파일을 올리려면 AWS 권한이 필요하다. 액세스 키를 GitHub에 저장하는 대신, **OIDC**로 "이 저장소의 `main` 브랜치에서 온 요청"이라는 사실을 증명하고 몇 분짜리 임시 권한만 받는 방식을 썼다.

## 왜 필요한가

- 액세스 키는 한 번 새면 계속 쓸 수 있어서 위험하다.
- OIDC 방식은 저장해 둘 비밀이 없다. GitHub이 요청마다 서명된 토큰을 만들어 주고, AWS가 그 토큰이 허용된 조건과 맞는지 확인한다.
- 역할(Role)의 권한도 필요한 것만 줄 수 있다.

```text
git push → GitHub Actions → (OIDC 토큰) → AWS STS → 임시 권한
        → S3에 업로드 → CloudFront 캐시 비우기
```

## 따라 해 보기

### 1. IAM에 GitHub을 ID 제공자로 등록

- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

### 2. 필요한 권한만 담은 정책

버킷에 올리고 지우고, 목록을 보고, CloudFront 캐시를 비우는 권한만 줬다. (계정 번호와 배포 ID는 가렸다.)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::aqua99-blog-site-2026/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::aqua99-blog-site-2026"
    },
    {
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::<계정번호>:distribution/<배포ID>"
    }
  ]
}
```

### 3. 역할과 신뢰 정책

역할에는 위 정책을 붙이고, 신뢰 정책에는 "누가 이 역할을 쓸 수 있는지"를 적는다. 핵심은 `Condition`의 `aud`와 `sub`이다.

### 4. 워크플로

`main`에 푸시하면 빌드하고, OIDC로 역할을 받아서 S3에 동기화하고, CloudFront 캐시를 비운다.

```yaml
permissions:
  id-token: write   # OIDC 토큰을 받으려면 필요
  contents: read

steps:
  - uses: actions/checkout@v4
  - uses: peaceiris/actions-hugo@v3
    with:
      hugo-version: '0.169.0'
      extended: true
  - run: hugo --gc --minify
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::<계정번호>:role/aqua-blog-github-deploy
      aws-region: ap-northeast-2
  - run: aws s3 sync public/ "s3://aqua99-blog-site-2026/" --delete
  - run: aws cloudfront create-invalidation --distribution-id <배포ID> --paths "/*"
```

## 막혔던 곳과 해결

첫 배포가 이 에러로 실패했다.

```text
Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity
```

Hugo 빌드까지는 통과했고, 역할을 받는 단계에서만 거절됐다. 신뢰 정책의 `Federated` 주소와 `aud`는 맞았기 때문에, 남은 후보는 `sub`였다. 추측하지 않고 워크플로에 임시 단계를 넣어서, GitHub이 실제로 보내는 값을 로그로 찍어 봤다. (토큰 자체는 찍지 않고 `sub`, `aud`, `iss`만 출력했다.)

실제로 온 `sub`는 이랬다.

```text
repo:Aqua99-99@241148948/Aqua-Blog@1446663564:ref:refs/heads/main
```

내가 신뢰 정책에 적었던 값은 이랬다.

```text
repo:Aqua99-99/Aqua-Blog:ref:refs/heads/main
```

사용자 이름과 저장소 이름 뒤에 숫자 ID(`@…`)가 붙어서 오고 있었고, 글자가 하나라도 다르면 `StringEquals`가 맞지 않는다. 내가 확인한 시점(2026-11-05) 기준의 형식이다. 신뢰 정책의 `sub`를 실제로 온 값으로 바꾸고 워크플로를 다시 실행하니 통과했다.

배운 점이다.

- 문서나 예전 글의 형식을 믿기 전에, 실제로 온 토큰 값을 확인하는 게 빠르다.
- ID까지 포함한 값으로 고정하면, 같은 이름의 다른 저장소가 이 역할을 쓰는 것도 막을 수 있다.
- 디버그 용도로 넣은 출력 단계는 원인을 찾은 뒤 지웠다.

## 정리

- 장기 액세스 키 없이 OIDC로 임시 권한을 받는 구성이 실무에서 권장되는 방식이다.
- 권한은 `s3:PutObject` 등 필요한 동작과 특정 버킷, 특정 배포로 좁혔다.
- 신뢰 정책의 `sub`는 GitHub이 실제로 보내는 값과 정확히 같아야 한다.
- 이제 `main`에 푸시하면 사이트가 자동으로 갱신된다.
