import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 교실 번호에서 학년과 반을 추론하는 함수
function parseClassroom(classroom: string): { grade: number; class_number: number } {
  const num = parseInt(classroom);
  if (isNaN(num) || num < 100 || num > 999) {
    throw new Error(`잘못된 교실 번호입니다: ${classroom}`);
  }
  const grade = Math.floor(num / 100);
  const class_number = num % 100;
  return { grade, class_number };
}

// 시작일의 월을 보고 학기를 자동 판단하는 함수
function getSemesterFromDate(startDate: string): number {
  const date = new Date(startDate);
  const month = date.getMonth() + 1; // 1-12
  // 3-7월 = 1학기, 8-1월 = 2학기
  if (month >= 3 && month <= 7) {
    return 1;
  } else {
    return 2;
  }
}

export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  
  try {
    const body = await request.json();
    const { start_date, end_date, name, slots } = body;

    // 유효성 검사
    if (!start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: '시작일, 종료일은 필수입니다.' },
        { status: 400 }
      );
    }

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json(
        { success: false, error: '시간표 슬롯이 필요합니다.' },
        { status: 400 }
      );
    }

    // 테이블 자동 생성 (classroom 컬럼 포함)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS timetables (
        id INT AUTO_INCREMENT PRIMARY KEY,
        semester INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // name 컬럼이 없으면 추가
    try {
      await connection.query(`
        ALTER TABLE timetables 
        ADD COLUMN name VARCHAR(100) AFTER end_date
      `);
    } catch (error: any) {
      // 컬럼이 이미 존재하면 무시
      if (!error.message.includes('Duplicate column name')) {
        throw error;
      }
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS timetable_slots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timetable_id INT NOT NULL,
        classroom VARCHAR(10),
        grade INT NOT NULL,
        class_number INT NOT NULL,
        weekday INT NOT NULL COMMENT '1=월요일, 2=화요일, 3=수요일, 4=목요일, 5=금요일',
        period INT NOT NULL COMMENT '교시',
        subject VARCHAR(50),
        INDEX idx_timetable (timetable_id),
        INDEX idx_schedule (grade, class_number, weekday, period),
        FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 필요한 컬럼들이 없으면 추가
    const columnsToAdd = [
      { name: 'classroom', type: 'VARCHAR(10)', after: 'timetable_id' },
      { name: 'grade', type: 'INT NOT NULL', after: 'classroom' },
      { name: 'class_number', type: 'INT NOT NULL', after: 'grade' },
    ];

    for (const col of columnsToAdd) {
      try {
        await connection.query(`
          ALTER TABLE timetable_slots 
          ADD COLUMN ${col.name} ${col.type} AFTER ${col.after}
        `);
      } catch (error: any) {
        // 컬럼이 이미 존재하면 무시
        if (!error.message.includes('Duplicate column name')) {
          throw error;
        }
      }
    }

    await connection.beginTransaction();

    try {
      // 시작일의 월을 보고 학기 자동 판단
      const semester = getSemesterFromDate(start_date);

      // timetables 테이블에 INSERT
      const [result] = await connection.query(
        `INSERT INTO timetables (semester, start_date, end_date, name) 
         VALUES (?, ?, ?, ?)`,
        [semester, start_date, end_date, name || null]
      ) as any[];

      const timetableId = result.insertId;

      // slots 배열을 VALUES 배열로 변환
      const slotValues = slots.map((slot: any) => {
        // 교실 번호에서 학년과 반 추론
        const { grade, class_number } = parseClassroom(slot.classroom);
        
        return [
          timetableId,
          slot.classroom,
          grade,
          class_number,
          slot.weekday,
          slot.period,
          slot.subject || null,
        ];
      });

      // timetable_slots 테이블에 bulk INSERT
      if (slotValues.length > 0) {
        // 기존 테이블에 class 컬럼이 있을 수 있으므로 확인
        try {
          // 먼저 class 컬럼이 있는지 확인하고, 있으면 포함
          const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'timetable_slots' 
            AND COLUMN_NAME = 'class'
          `) as any[];

          const hasClassColumn = Array.isArray(columns) && columns.length > 0;

          if (hasClassColumn) {
            // class 컬럼이 있으면 class_number 값을 class에도 넣기
            const slotValuesWithClass = slots.map((slot: any) => {
              const { grade, class_number } = parseClassroom(slot.classroom);
              return [
                timetableId,
                slot.classroom,
                grade,
                class_number,
                class_number, // class 컬럼에도 같은 값
                slot.weekday,
                slot.period,
                slot.subject || null,
              ];
            });

            const placeholders = slotValuesWithClass.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
            const query = `INSERT INTO timetable_slots 
              (timetable_id, classroom, grade, class_number, class, weekday, period, subject) 
              VALUES ${placeholders}`;

            const flatValues = slotValuesWithClass.flat();
            await connection.query(query, flatValues);
          } else {
            // class 컬럼이 없으면 기존 방식대로
            const placeholders = slotValues.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
            const query = `INSERT INTO timetable_slots 
              (timetable_id, classroom, grade, class_number, weekday, period, subject) 
              VALUES ${placeholders}`;

            const flatValues = slotValues.flat();
            await connection.query(query, flatValues);
          }
        } catch (error: any) {
          // 컬럼 확인 실패 시 기본 방식으로 시도
          const placeholders = slotValues.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
          const query = `INSERT INTO timetable_slots 
            (timetable_id, classroom, grade, class_number, weekday, period, subject) 
            VALUES ${placeholders}`;

          const flatValues = slotValues.flat();
          await connection.query(query, flatValues);
        }
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        timetableId,
        message: '시간표가 저장되었습니다.',
      });
    } catch (error: any) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    connection.release();
    return NextResponse.json(
      {
        success: false,
        error: error.message || '시간표 저장 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const connection = await pool.getConnection();

    try {
      // timetables와 timetable_slots LEFT JOIN
      const [rows] = await connection.query(`
        SELECT 
          t.id,
          t.semester,
          t.start_date,
          t.end_date,
          t.name,
          t.created_at,
          COUNT(ts.id) as slot_count
        FROM timetables t
        LEFT JOIN timetable_slots ts ON t.id = ts.timetable_id
        GROUP BY t.id
        ORDER BY t.start_date DESC
      `);

      return NextResponse.json({
        success: true,
        timetables: rows,
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || '시간표 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
