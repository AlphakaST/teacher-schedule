# 배포 가이드

## GitHub에 푸시하기

### 1. GitHub 저장소 생성
1. GitHub에 로그인
2. 새 저장소 생성 (New Repository)
3. 저장소 이름 입력 (예: `teacher-schedule`)
4. Public 또는 Private 선택
5. "Create repository" 클릭

### 2. 원격 저장소 연결 및 푸시

```bash
# 원격 저장소 추가 (YOUR_USERNAME과 YOUR_REPO_NAME을 실제 값으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 또는 SSH 사용 시
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git

# 브랜치 이름 확인 (필요시 main으로 변경)
git branch -M main

# GitHub에 푸시
git push -u origin main
```

## Vercel 배포하기

### 1. Vercel 계정 준비
1. [Vercel](https://vercel.com)에 로그인
2. GitHub 계정으로 연동

### 2. 프로젝트 배포
1. Vercel 대시보드에서 "Add New Project" 클릭
2. GitHub 저장소 선택
3. 프로젝트 설정:
   - **Framework Preset**: Next.js
   - **Root Directory**: `teacher-schedule` (또는 프로젝트 루트)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3. 환경 변수 설정
Vercel 대시보드에서 다음 환경 변수를 추가:

```
MYSQL_HOST=your_mysql_host
MYSQL_PORT=3306
MYSQL_DATABASE=your_database_name
MYSQL_USER=your_mysql_user
MYSQL_PASSWORD=your_mysql_password
OPENAI_API_KEY=your_openai_api_key
```

### 4. 배포 확인
- 배포가 완료되면 Vercel이 자동으로 URL을 제공합니다
- GitHub에 푸시할 때마다 자동으로 재배포됩니다

## 주의사항

1. **데이터베이스 접근**: Vercel은 서버리스 환경이므로 MySQL 연결이 필요합니다
   - 외부 MySQL 서버 사용 (예: PlanetScale, AWS RDS, Railway 등)
   - 또는 Vercel Postgres 사용 고려

2. **파일 업로드**: `public/uploads` 폴더는 Vercel의 임시 파일 시스템에 저장됩니다
   - 영구 저장이 필요하면 S3, Cloudinary 등 외부 스토리지 사용 권장

3. **환경 변수**: 민감한 정보는 절대 코드에 포함하지 말고 환경 변수로 관리

