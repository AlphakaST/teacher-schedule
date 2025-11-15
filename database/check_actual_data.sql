-- 실제 저장된 날짜 값 확인

-- 1. 모든 시간표의 실제 날짜 값 확인
SELECT 
    id,
    name,
    semester,
    start_date,
    end_date,
    DATE_FORMAT(start_date, '%Y-%m-%d') as start_date_formatted,
    DATE_FORMAT(end_date, '%Y-%m-%d') as end_date_formatted,
    YEAR(start_date) as start_year,
    YEAR(end_date) as end_year
FROM timetables
ORDER BY id DESC;

-- 2. 가장 최근 시간표 확인
SELECT 
    id,
    name,
    semester,
    start_date,
    end_date,
    DATE_FORMAT(start_date, '%Y-%m-%d') as start_date_str,
    DATE_FORMAT(end_date, '%Y-%m-%d') as end_date_str
FROM timetables
ORDER BY id DESC
LIMIT 5;

