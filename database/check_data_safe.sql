-- 안전한 데이터 확인 쿼리 (MySQL 오류 방지)

-- 1. 모든 시간표 데이터 확인 (문자열로 변환하여 확인)
SELECT 
    id,
    name,
    DATE_FORMAT(start_date, '%Y-%m-%d') as start_date_str,
    DATE_FORMAT(end_date, '%Y-%m-%d') as end_date_str,
    CASE 
        WHEN start_date IS NULL THEN 'NULL'
        WHEN DATE_FORMAT(start_date, '%Y-%m-%d') = '0000-00-00' THEN '0000-00-00'
        WHEN start_date < '1900-01-01' THEN '잘못된 날짜'
        ELSE '정상'
    END as start_date_status,
    CASE 
        WHEN end_date IS NULL THEN 'NULL'
        WHEN DATE_FORMAT(end_date, '%Y-%m-%d') = '0000-00-00' THEN '0000-00-00'
        WHEN end_date < '1900-01-01' THEN '잘못된 날짜'
        ELSE '정상'
    END as end_date_status
FROM timetables
ORDER BY id DESC;

-- 2. 문제가 있는 시간표 찾기 (문자열 비교 사용)
SELECT 
    id,
    name,
    DATE_FORMAT(start_date, '%Y-%m-%d') as start_date_str,
    DATE_FORMAT(end_date, '%Y-%m-%d') as end_date_str
FROM timetables
WHERE start_date IS NULL 
   OR end_date IS NULL 
   OR DATE_FORMAT(start_date, '%Y-%m-%d') = '0000-00-00'
   OR DATE_FORMAT(end_date, '%Y-%m-%d') = '0000-00-00'
   OR start_date < '1900-01-01'
   OR end_date < '1900-01-01';

-- 3. 간단한 확인 (NULL만 체크)
SELECT 
    id,
    name,
    start_date,
    end_date
FROM timetables
WHERE start_date IS NULL 
   OR end_date IS NULL;

