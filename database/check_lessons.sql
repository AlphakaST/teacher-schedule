-- lessons 테이블 확인 쿼리

-- 1. lessons 테이블 구조 확인
DESCRIBE lessons;

-- 2. lessons 테이블의 모든 데이터 확인
SELECT 
    id,
    lesson_date,
    DATE_FORMAT(lesson_date, '%Y-%m-%d') as lesson_date_str,
    grade,
    class_number,
    period,
    lesson_order,
    lesson_title,
    subject
FROM lessons
ORDER BY lesson_date DESC, grade, class_number, period
LIMIT 50;

-- 3. 문제가 있는 lesson_date 찾기 (NULL 또는 잘못된 날짜)
SELECT 
    id,
    lesson_date,
    DATE_FORMAT(lesson_date, '%Y-%m-%d') as lesson_date_str,
    grade,
    class_number,
    period,
    subject
FROM lessons
WHERE lesson_date IS NULL
   OR DATE_FORMAT(lesson_date, '%Y-%m-%d') = '0000-00-00'
   OR lesson_date < '1900-01-01';

-- 4. 최근 생성된 lessons 확인
SELECT 
    id,
    lesson_date,
    DATE_FORMAT(lesson_date, '%Y-%m-%d') as lesson_date_str,
    grade,
    class_number,
    period,
    lesson_order,
    subject,
    created_at
FROM lessons
ORDER BY created_at DESC
LIMIT 20;

-- 5. 특정 기간의 lessons 확인
SELECT 
    id,
    lesson_date,
    DATE_FORMAT(lesson_date, '%Y-%m-%d') as lesson_date_str,
    grade,
    class_number,
    period,
    subject
FROM lessons
WHERE lesson_date BETWEEN '2025-11-03' AND '2025-12-05'
ORDER BY lesson_date, grade, class_number, period;

