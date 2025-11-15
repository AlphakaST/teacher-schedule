import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    // 필수 파라미터 검증
    if (!start || !end) {
      return NextResponse.json(
        { success: false, error: '필수 파라미터가 없습니다. (start, end)' },
        { status: 400 }
      );
    }

    // 날짜 형식 검증
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return NextResponse.json(
        { success: false, error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // lessons 테이블과 lesson_memos LEFT JOIN 조회 (모든 학년/반)
    const [lessons] = await connection.query(
      `SELECT 
        l.id,
        l.lesson_date,
        DATE_FORMAT(l.lesson_date, '%Y-%m-%d') as lesson_date_str,
        l.grade,
        l.class_number,
        l.period,
        l.lesson_order,
        l.lesson_title,
        l.subject,
        l.created_at,
        lm.id as memo_id,
        lm.memo_text,
        lm.updated_at as memo_updated_at
      FROM lessons l
      LEFT JOIN lesson_memos lm ON l.id = lm.lesson_id
      WHERE l.lesson_date BETWEEN ? AND ?
      ORDER BY l.grade, l.class_number, l.lesson_date, l.period`,
      [start, end]
    ) as any[];

    // 학사 일정 조회
    const [calendarEvents] = await connection.query(
      `SELECT 
        event_date,
        DATE_FORMAT(event_date, '%Y-%m-%d') as event_date_str,
        title,
        description,
        is_holiday
      FROM school_calendar
      WHERE event_date BETWEEN ? AND ?
      ORDER BY event_date`,
      [start, end]
    ) as any[];

    return NextResponse.json({
      success: true,
      lessons: Array.isArray(lessons) ? lessons : [],
      calendarEvents: Array.isArray(calendarEvents) ? calendarEvents : [],
    });
  } catch (error: any) {
    console.error('❌ 주간 수업 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '주간 수업 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

