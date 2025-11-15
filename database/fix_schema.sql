-- 스키마 수정 및 데이터 정리 스크립트

-- 1. timetable_slots 테이블에 classroom 컬럼이 없으면 추가
ALTER TABLE timetable_slots 
ADD COLUMN IF NOT EXISTS classroom VARCHAR(10) AFTER timetable_id;

-- 2. timetables 테이블의 잘못된 날짜 데이터 확인 및 수정
-- 주의: 실제로 문제가 있는 데이터만 수정하세요

-- 문제가 있는 시간표 확인 (안전한 방법)
SELECT 
    id,
    name,
    start_date,
    end_date,
    DATE_FORMAT(start_date, '%Y-%m-%d') as start_date_str,
    DATE_FORMAT(end_date, '%Y-%m-%d') as end_date_str,
    CASE 
        WHEN start_date IS NULL OR CAST(start_date AS CHAR) = '0000-00-00' THEN '시작일 문제'
        WHEN end_date IS NULL OR CAST(end_date AS CHAR) = '0000-00-00' THEN '종료일 문제'
        ELSE '정상'
    END as 문제유형
FROM timetables
WHERE start_date IS NULL 
   OR end_date IS NULL 
   OR CAST(start_date AS CHAR) = '0000-00-00'
   OR CAST(end_date AS CHAR) = '0000-00-00';

-- 3. MySQL에서 0000-00-00 허용 모드 확인
-- 만약 NO_ZERO_DATE 모드가 활성화되어 있으면, 0000-00-00을 허용하지 않습니다.
-- 이 경우 데이터를 수정해야 합니다.

-- 4. 문제가 있는 데이터 수정 예시 (실제 날짜로 변경 필요)
-- UPDATE timetables 
-- SET start_date = '2025-01-01', end_date = '2025-12-31'
-- WHERE id = ? AND (start_date IS NULL OR start_date = '0000-00-00' OR end_date IS NULL OR end_date = '0000-00-00');

