-- lessons 테이블의 잘못된 날짜 데이터 확인 및 수정

-- 1. 잘못된 날짜 데이터 확인
SELECT 
    id,
    lesson_date,
    DATE_FORMAT(lesson_date, '%Y-%m-%d') as lesson_date_str,
    grade,
    class_number,
    period,
    subject,
    created_at
FROM lessons
WHERE lesson_date IS NULL
   OR DATE_FORMAT(lesson_date, '%Y-%m-%d') = '0000-00-00'
   OR lesson_date < '1900-01-01'
ORDER BY created_at DESC;

-- 2. 잘못된 날짜 데이터 개수 확인
SELECT 
    COUNT(*) as bad_date_count,
    SUM(CASE WHEN lesson_date IS NULL THEN 1 ELSE 0 END) as null_count,
    SUM(CASE WHEN DATE_FORMAT(lesson_date, '%Y-%m-%d') = '0000-00-00' THEN 1 ELSE 0 END) as zero_date_count,
    SUM(CASE WHEN lesson_date < '1900-01-01' THEN 1 ELSE 0 END) as invalid_date_count
FROM lessons
WHERE lesson_date IS NULL
   OR DATE_FORMAT(lesson_date, '%Y-%m-%d') = '0000-00-00'
   OR lesson_date < '1900-01-01';

-- 3. 잘못된 날짜 데이터 삭제 (주의: 실행 전에 위 쿼리로 확인하세요!)
-- DELETE FROM lessons 
-- WHERE lesson_date IS NULL
--    OR DATE_FORMAT(lesson_date, '%Y-%m-%d') = '0000-00-00'
--    OR lesson_date < '1900-01-01';

-- 4. MySQL sql_mode 확인 (0000-00-00 허용 여부)
SELECT @@sql_mode;

-- 5. sql_mode에서 NO_ZERO_DATE 확인
-- NO_ZERO_DATE가 있으면 '0000-00-00' 날짜를 허용하지 않습니다.
-- 이 경우 잘못된 날짜 데이터를 삭제해야 합니다.

-- 6. 모든 lessons 데이터 확인 (최근 50개)
SELECT 
    id,
    lesson_date,
    DATE_FORMAT(lesson_date, '%Y-%m-%d') as lesson_date_str,
    grade,
    class_number,
    period,
    subject,
    created_at
FROM lessons
ORDER BY created_at DESC
LIMIT 50;

