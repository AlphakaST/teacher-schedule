import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    const body = await request.json();
    const { lessonId, memoText } = body;

    // 필수 파라미터 검증
    if (!lessonId) {
      return NextResponse.json(
        { success: false, error: 'lessonId가 필요합니다.' },
        { status: 400 }
      );
    }

    // lessonId가 숫자인지 확인
    const lessonIdNum = parseInt(lessonId, 10);
    if (isNaN(lessonIdNum)) {
      return NextResponse.json(
        { success: false, error: 'lessonId가 유효하지 않습니다.' },
        { status: 400 }
      );
    }

    // lesson이 존재하는지 확인
    const [lessons] = await connection.query(
      'SELECT id FROM lessons WHERE id = ?',
      [lessonIdNum]
    ) as any[];

    if (!Array.isArray(lessons) || lessons.length === 0) {
      return NextResponse.json(
        { success: false, error: '해당 수업을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    await connection.beginTransaction();

    try {
      // 기존 메모 확인
      const [existingMemos] = await connection.query(
        'SELECT id FROM lesson_memos WHERE lesson_id = ?',
        [lessonIdNum]
      ) as any[];

      const memoTextValue = memoText ? String(memoText).trim() : '';

      if (Array.isArray(existingMemos) && existingMemos.length > 0) {
        // 기존 메모가 있으면 UPDATE
        if (memoTextValue) {
          await connection.query(
            'UPDATE lesson_memos SET memo_text = ?, updated_at = NOW() WHERE lesson_id = ?',
            [memoTextValue, lessonIdNum]
          );
        } else {
          // 메모가 비어있으면 삭제
          await connection.query(
            'DELETE FROM lesson_memos WHERE lesson_id = ?',
            [lessonIdNum]
          );
        }
      } else {
        // 기존 메모가 없으면 INSERT (메모가 있는 경우만)
        if (memoTextValue) {
          await connection.query(
            'INSERT INTO lesson_memos (lesson_id, memo_text) VALUES (?, ?)',
            [lessonIdNum, memoTextValue]
          );
        }
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: '메모가 저장되었습니다.',
      });
    } catch (error: any) {
      await connection.rollback();
      throw error;
    }
  } catch (error: any) {
    console.error('❌ 메모 저장 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '메모 저장 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

