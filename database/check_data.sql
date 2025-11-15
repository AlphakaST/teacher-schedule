-- 데이터베이스 데이터 확인 및 수정 스크립트

-- 1. timetables 테이블의 날짜 데이터 확인
SELECT 
    id,
    semester,
    start_date,
    end_date,
    name,
    DATE_FORMAT(start_date, '%Y-%m-%d') as start_date_str,
    DATE_FORMAT(end_date, '%Y-%m-%d') as end_date_str,
    CASE 
        WHEN start_date IS NULL THEN 'NULL'
        WHEN CAST(start_date AS CHAR) = '0000-00-00' THEN '0000-00-00'
        WHEN start_date < '1900-01-01' THEN '잘못된 날짜'
        ELSE '정상'
    END as start_date_status,
    CASE 
        WHEN end_date IS NULL THEN 'NULL'
        WHEN CAST(end_date AS CHAR) = '0000-00-00' THEN '0000-00-00'
        WHEN end_date < '1900-01-01' THEN '잘못된 날짜'
        ELSE '정상'
    END as end_date_status
FROM timetables
ORDER BY id DESC;

-- 2. 문제가 있는 시간표 찾기 (NULL 또는 잘못된 날짜)
-- 주의: '0000-00-00'은 직접 비교할 수 없으므로 CAST나 다른 방법 사용
SELECT 
    id,
    semester,
    start_date,
    end_date,
    name,
    DATE_FORMAT(start_date, '%Y-%m-%d') as start_date_str,
    DATE_FORMAT(end_date, '%Y-%m-%d') as end_date_str
FROM timetables
WHERE start_date IS NULL 
   OR end_date IS NULL 
   OR CAST(start_date AS CHAR) = '0000-00-00'
   OR CAST(end_date AS CHAR) = '0000-00-00'
   OR start_date < '1900-01-01'
   OR end_date < '1900-01-01';

-- 3. timetable_slots 테이블 구조 확인
DESCRIBE timetable_slots;

-- 4. MySQL sql_mode 확인 (0000-00-00 허용 여부)
SELECT @@sql_mode;

-- 5. 문제가 있는 시간표 삭제 (필요시)
-- DELETE FROM timetables WHERE start_date IS NULL OR end_date IS NULL OR start_date = '0000-00-00' OR end_date = '0000-00-00';

