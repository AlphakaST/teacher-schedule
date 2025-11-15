-- MySQL 데이터베이스 스키마 생성 스크립트

-- 1. school_calendar 테이블 (학사일정)
CREATE TABLE IF NOT EXISTS school_calendar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_date DATE NOT NULL,
    title VARCHAR(200),
    description TEXT,
    is_holiday BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_date (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. timetables 테이블 (시간표)
CREATE TABLE IF NOT EXISTS timetables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    semester INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. timetable_slots 테이블 (시간표 슬롯)
CREATE TABLE IF NOT EXISTS timetable_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timetable_id INT NOT NULL,
    grade INT NOT NULL,
    class_number INT NOT NULL,
    weekday INT NOT NULL COMMENT '1=월요일, 2=화요일, 3=수요일, 4=목요일, 5=금요일',
    period INT NOT NULL COMMENT '교시',
    subject VARCHAR(50),
    INDEX idx_timetable (timetable_id),
    INDEX idx_schedule (grade, class_number, weekday, period),
    FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. lessons 테이블 (수업)
CREATE TABLE IF NOT EXISTS lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lesson_date DATE NOT NULL,
    grade INT NOT NULL,
    class_number INT NOT NULL,
    period INT NOT NULL,
    lesson_order INT NOT NULL COMMENT '차시 번호',
    lesson_title VARCHAR(200) COMMENT '예: "1차시"',
    subject VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_date (lesson_date),
    INDEX idx_class (grade, class_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. lesson_memos 테이블 (수업 메모)
CREATE TABLE IF NOT EXISTS lesson_memos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lesson_id INT NOT NULL,
    memo_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_lesson (lesson_id),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

