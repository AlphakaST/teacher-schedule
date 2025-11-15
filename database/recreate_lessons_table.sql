-- lessons 테이블 재생성 스크립트
-- 기존 테이블을 삭제하고 올바른 구조로 새로 생성합니다.

-- ============================================
-- 1. 기존 테이블 삭제 (외래 키 때문에 순서 중요)
-- ============================================
DROP TABLE IF EXISTS lesson_memos;
DROP TABLE IF EXISTS lessons;

-- ============================================
-- 2. lessons 테이블 새로 생성
-- ============================================
CREATE TABLE lessons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lesson_date DATE NOT NULL,
  grade INT NOT NULL,
  class_number INT NOT NULL,
  period INT NOT NULL,
  lesson_order INT NOT NULL COMMENT '차시 번호',
  lesson_title VARCHAR(200),
  subject VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (lesson_date),
  INDEX idx_class (grade, class_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. lesson_memos 테이블 새로 생성
-- ============================================
CREATE TABLE lesson_memos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lesson_id INT NOT NULL,
  memo_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_lesson (lesson_id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. 테이블 구조 확인
-- ============================================
DESCRIBE lessons;
DESCRIBE lesson_memos;

-- ============================================
-- 5. 인덱스 확인
-- ============================================
SHOW INDEX FROM lessons;
SHOW INDEX FROM lesson_memos;

