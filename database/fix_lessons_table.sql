-- lessons 테이블 구조 확인 및 수정

-- 1. 현재 lessons 테이블 구조 확인
DESCRIBE lessons;

-- 2. lessons 테이블의 모든 컬럼 확인
SHOW COLUMNS FROM lessons;

-- 3. lesson_date 컬럼이 없으면 추가
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS lesson_date DATE NOT NULL AFTER id;

-- 4. 다른 필요한 컬럼들도 확인 및 추가
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS grade INT NOT NULL AFTER lesson_date;

ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS class_number INT NOT NULL AFTER grade;

ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS period INT NOT NULL AFTER class_number;

ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS lesson_order INT NOT NULL COMMENT '차시 번호' AFTER period;

ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS lesson_title VARCHAR(200) COMMENT '예: "1차시"' AFTER lesson_order;

ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS subject VARCHAR(50) AFTER lesson_title;

-- 5. 인덱스 추가 (없는 경우)
CREATE INDEX IF NOT EXISTS idx_date ON lessons(lesson_date);
CREATE INDEX IF NOT EXISTS idx_class ON lessons(grade, class_number);

-- 6. 최종 테이블 구조 확인
DESCRIBE lessons;

