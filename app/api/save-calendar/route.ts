import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events } = body;

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { success: false, error: 'events 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    if (events.length === 0) {
      return NextResponse.json(
        { success: false, error: '저장할 일정이 없습니다.' },
        { status: 400 }
      );
    }

    // 트랜잭션 시작
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 기존 테이블이 있으면 삭제하고 재생성 (구조 변경 대응)
      await connection.query('DROP TABLE IF EXISTS school_calendar');
      
      // 테이블 생성
      await connection.query(`
        CREATE TABLE school_calendar (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_date DATE NOT NULL,
          title VARCHAR(200),
          description TEXT,
          is_holiday BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_date (event_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 새 데이터 bulk INSERT
      if (events.length > 0) {
        const values = events.map((event: any) => [
          event.date,
          event.title || null,
          event.description || null,
          event.is_holiday || false,
        ]);

        const placeholders = events.map(() => '(?, ?, ?, ?)').join(', ');
        const query = `INSERT INTO school_calendar (event_date, title, description, is_holiday) VALUES ${placeholders}`;

        const flatValues = values.flat();
        await connection.query(query, flatValues);
      }

      // 커밋
      await connection.commit();
      connection.release();

      return NextResponse.json({
        success: true,
        count: events.length,
        message: `${events.length}개 일정이 저장되었습니다.`,
      });
    } catch (error: any) {
      // 롤백
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || '데이터베이스 저장 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}

