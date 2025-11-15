-- lessons 테이블 구조 확인 및 수정

-- ============================================
-- 1단계: 테이블 구조 확인
-- ============================================

-- 1. lessons 테이블 구조 확인
DESCRIBE lessons;

-- 2. lessons 테이블의 모든 컬럼 확인
SHOW COLUMNS FROM lessons;

-- 3. lessons 테이블이 존재하는지 확인
SHOW TABLES LIKE 'lessons';

-- 4. 현재 lessons 테이블의 데이터 확인 (컬럼 이름 확인용)
SELECT * FROM lessons LIMIT 5;

-- ============================================
-- 2단계: 컬럼 추가 (lesson_date가 없는 경우)
-- ============================================

-- lesson_date 컬럼 추가 (없는 경우)
-- 주의: MySQL 버전에 따라 IF NOT EXISTS를 지원하지 않을 수 있습니다.
-- 먼저 위 쿼리로 확인한 후 실행하세요.

-- 방법 1: IF NOT EXISTS 사용 (MySQL 8.0.19+)
-- ALTER TABLE lessons 
-- ADD COLUMN IF NOT EXISTS lesson_date DATE NOT NULL AFTER id;

-- 방법 2: 에러 무시 (MySQL 5.7 이하)
-- ALTER TABLE lessons 
-- ADD COLUMN lesson_date DATE NOT NULL AFTER id;

-- 방법 3: 안전하게 추가 (컬럼이 없을 때만)
-- 먼저 컬럼 존재 여부 확인 후 실행
-- SELECT COUNT(*) as column_exists
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND TABLE_NAME = 'lessons'
--   AND COLUMN_NAME = 'lesson_date';

-- ============================================
-- 3단계: 다른 필요한 컬럼들 추가
-- ============================================

-- grade 컬럼 추가
-- ALTER TABLE lessons 
-- ADD COLUMN IF NOT EXISTS grade INT NOT NULL AFTER lesson_date;

-- class_number 컬럼 추가
-- ALTER TABLE lessons 
-- ADD COLUMN IF NOT EXISTS class_number INT NOT NULL AFTER grade;

-- period 컬럼 추가
-- ALTER TABLE lessons 
-- ADD COLUMN IF NOT EXISTS period INT NOT NULL AFTER class_number;

-- lesson_order 컬럼 추가
-- ALTER TABLE lessons 
-- ADD COLUMN IF NOT EXISTS lesson_order INT NOT NULL COMMENT '차시 번호' AFTER period;

-- lesson_title 컬럼 추가
-- ALTER TABLE lessons 
-- ADD COLUMN IF NOT EXISTS lesson_title VARCHAR(200) COMMENT '예: "1차시"' AFTER lesson_order;

-- subject 컬럼 추가
-- ALTER TABLE lessons 
-- ADD COLUMN IF NOT EXISTS subject VARCHAR(50) AFTER lesson_title;

-- ============================================
-- 4단계: 잘못된 날짜 데이터 확인 (컬럼 추가 후)
-- ============================================

-- lesson_date 컬럼이 추가된 후 실행
SELECT 
    id,
    lesson_date,
    DATE_FORMAT(lesson_date, '%Y-%m-%d') as lesson_date_str,
    CAST(lesson_date AS CHAR) as lesson_date_raw,
    grade,
    class_number,
    period,
    subject,
    created_at,
    CASE 
        WHEN lesson_date IS NULL THEN '❌ NULL'
        WHEN DATE_FORMAT(lesson_date, '%Y-%m-%d') = '0000-00-00' THEN '❌ 0000-00-00'
        WHEN lesson_date < '1900-01-01' THEN '❌ 잘못된 날짜'
        ELSE '✅ 정상'
    END as status
FROM lessons
WHERE lesson_date IS NULL
   OR DATE_FORMAT(lesson_date, '%Y-%m-%d') = '0000-00-00'
   OR lesson_date < '1900-01-01'
ORDER BY created_at DESC;

-- ============================================
-- 5단계: 잘못된 날짜 데이터 삭제 (필요시)
-- ============================================

-- DELETE FROM lessons 
-- WHERE lesson_date IS NULL
--    OR DATE_FORMAT(lesson_date, '%Y-%m-%d') = '0000-00-00'
--    OR lesson_date < '1900-01-01';

