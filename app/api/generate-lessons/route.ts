import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 안전한 날짜 변환 함수들
const formatDateToMySQL = (date: Date): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error(`Invalid Date 객체: ${date}`);
  }
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // 유효성 검사
  if (year < 1900 || year > 2100) {
    throw new Error(`잘못된 연도: ${year}`);
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`잘못된 날짜: ${year}-${month}-${day}`);
  }
  
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  // 최종 검증
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || dateStr === '0000-00-00') {
    throw new Error(`날짜 포맷 오류: ${dateStr}`);
  }
  
  return dateStr;
};

const parseDateString = (dateStr: string): Date => {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error(`날짜 문자열이 유효하지 않습니다: ${dateStr}`);
  }
  
  const trimmed = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`날짜 형식 오류: ${trimmed}`);
  }
  
  const [year, month, day] = trimmed.split('-').map(Number);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`날짜 파싱 실패: ${trimmed}`);
  }
  
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`잘못된 날짜 값: ${trimmed}`);
  }
  
  const date = new Date(year, month - 1, day);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid Date: ${trimmed}`);
  }
  
  // 생성된 날짜가 원본과 일치하는지 확인
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    throw new Error(`날짜 변환 오류: ${trimmed} -> ${formatDateToMySQL(date)}`);
  }
  
  return date;
};

const addDaysToDateString = (dateStr: string, days: number): string => {
  // 입력 검증
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error(`addDaysToDateString: 잘못된 입력 - dateStr: "${dateStr}" (type: ${typeof dateStr})`);
  }
  
  const trimmed = dateStr.trim();
  if (!trimmed || trimmed === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`addDaysToDateString: 잘못된 날짜 형식 - "${trimmed}"`);
  }
  
  try {
    const date = parseDateString(trimmed);
    date.setDate(date.getDate() + days);
    const result = formatDateToMySQL(date);
    
    // 결과 검증
    if (!result || result === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(result)) {
      throw new Error(`addDaysToDateString: 결과가 유효하지 않음 - "${result}"`);
    }
    
    return result;
  } catch (error: any) {
    throw new Error(`addDaysToDateString 실패: ${error.message}. 입력: "${dateStr}", days: ${days}`);
  }
};

const getWeekdayFromDateString = (dateStr: string): number => {
  const date = parseDateString(dateStr);
  return date.getDay(); // 0=일, 1=월, ..., 6=토
};

export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    const body = await request.json();
    const { timetableId } = body;

    if (!timetableId) {
      return NextResponse.json(
        { success: false, error: '시간표 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // lessons 테이블 자동 생성 및 컬럼 추가
    console.log('🔧 lessons 테이블 확인 및 생성 중...');
    
    // 테이블이 없으면 생성
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // 필요한 컬럼들이 없으면 추가 (외래 키 제약 때문에 테이블 삭제 불가)
    const columnsToAdd = [
      { name: 'lesson_date', type: 'DATE NOT NULL', after: 'id' },
      { name: 'grade', type: 'INT NOT NULL', after: 'lesson_date' },
      { name: 'class_number', type: 'INT NOT NULL', after: 'grade' },
      { name: 'period', type: 'INT NOT NULL', after: 'class_number' },
      { name: 'lesson_order', type: 'INT NOT NULL', after: 'period' },
      { name: 'lesson_title', type: 'VARCHAR(200)', after: 'lesson_order' },
      { name: 'subject', type: 'VARCHAR(50)', after: 'lesson_title' },
    ];

    for (const col of columnsToAdd) {
      try {
        await connection.query(`
          ALTER TABLE lessons 
          ADD COLUMN ${col.name} ${col.type} AFTER ${col.after}
        `);
        console.log(`✅ 컬럼 추가 완료: ${col.name}`);
      } catch (error: any) {
        // 컬럼이 이미 존재하면 무시
        if (error.message.includes('Duplicate column name')) {
          console.log(`ℹ️ 컬럼 이미 존재: ${col.name}`);
        } else {
          console.error(`❌ 컬럼 추가 실패: ${col.name}`, error.message);
          throw error;
        }
      }
    }
    
    // 인덱스 추가 (없는 경우)
    try {
      await connection.query('CREATE INDEX IF NOT EXISTS idx_date ON lessons(lesson_date)');
    } catch (error: any) {
      if (!error.message.includes('Duplicate key name')) {
        console.warn('인덱스 추가 경고:', error.message);
      }
    }
    
    try {
      await connection.query('CREATE INDEX IF NOT EXISTS idx_class ON lessons(grade, class_number)');
    } catch (error: any) {
      if (!error.message.includes('Duplicate key name')) {
        console.warn('인덱스 추가 경고:', error.message);
      }
    }
    
    console.log('✅ lessons 테이블 준비 완료');

    await connection.beginTransaction();

    try {
      // 1) 시간표 정보 조회 (DATE_FORMAT으로 문자열로 직접 조회하여 안전하게 처리)
      console.log('🔍 시간표 조회 시작 - timetableId:', timetableId);
      
      // DATE_FORMAT으로 문자열로 직접 조회 (Date 객체 변환 문제 방지)
      const [timetablesRaw] = await connection.query(
        `SELECT 
          id,
          semester,
          DATE_FORMAT(start_date, '%Y-%m-%d') as start_date,
          DATE_FORMAT(end_date, '%Y-%m-%d') as end_date,
          name,
          created_at
        FROM timetables WHERE id = ?`,
        [timetableId]
      ) as any[];

      console.log('📋 조회된 시간표 원본 데이터:', JSON.stringify(timetablesRaw, null, 2));
      
      // DATE_FORMAT 결과가 NULL인 경우 체크
      if (timetablesRaw && timetablesRaw.length > 0) {
        const timetable = timetablesRaw[0];
        if (!timetable.start_date || !timetable.end_date || 
            timetable.start_date === 'NULL' || timetable.end_date === 'NULL' ||
            timetable.start_date === null || timetable.end_date === null) {
          throw new Error(`시간표의 날짜가 NULL입니다. ID: ${timetableId}, start_date: ${timetable.start_date}, end_date: ${timetable.end_date}`);
        }
      }

      if (!Array.isArray(timetablesRaw) || timetablesRaw.length === 0) {
        throw new Error('시간표를 찾을 수 없습니다.');
      }

      const timetableRaw = timetablesRaw[0];
      console.log('📅 시간표 원본 데이터:', {
        id: timetableRaw.id,
        semester: timetableRaw.semester,
        start_date: timetableRaw.start_date,
        end_date: timetableRaw.end_date,
        start_date_type: typeof timetableRaw.start_date,
        end_date_type: typeof timetableRaw.end_date,
        start_date_isDate: timetableRaw.start_date instanceof Date,
        end_date_isDate: timetableRaw.end_date instanceof Date,
      });

      // 날짜 유효성 검사
      if (!timetableRaw.start_date || !timetableRaw.end_date) {
        console.error('❌ 시간표 날짜 누락:', {
          start_date: timetableRaw.start_date,
          end_date: timetableRaw.end_date,
        });
        throw new Error('시간표의 시작일 또는 종료일이 없습니다.');
      }

      // DATE_FORMAT으로 이미 문자열로 조회했으므로 간단히 처리
      const convertDateToString = (dateValue: any): string => {
        console.log('🔄 convertDateToString 호출:', {
          dateValue,
          type: typeof dateValue,
          isDate: dateValue instanceof Date,
          isNull: dateValue === null,
          isUndefined: dateValue === undefined,
        });

        if (dateValue === null || dateValue === undefined) {
          throw new Error('날짜 값이 null 또는 undefined입니다.');
        }

        // 문자열인 경우 (DATE_FORMAT 결과)
        if (typeof dateValue === 'string') {
          const trimmed = dateValue.trim();
          console.log('📝 문자열 처리:', { 원본: dateValue, trimmed });
          
          if (!trimmed || trimmed === '0000-00-00' || trimmed === 'NULL' || trimmed === 'null' || trimmed === '') {
            throw new Error(`날짜 문자열이 유효하지 않습니다: "${trimmed}"`);
          }
          
          // YYYY-MM-DD 형식 확인
          if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            throw new Error(`날짜 형식이 잘못되었습니다: "${trimmed}"`);
          }
          
          // '0000-00-00' 체크
          if (trimmed === '0000-00-00') {
            throw new Error(`날짜가 0000-00-00입니다: "${trimmed}"`);
          }
          
          console.log('✅ 문자열 변환 성공:', trimmed);
          return trimmed;
        }

        // Date 객체인 경우 (혹시 모를 경우)
        if (dateValue instanceof Date) {
          if (isNaN(dateValue.getTime())) {
            throw new Error('Invalid Date 객체입니다.');
          }
          const result = formatDateToMySQL(dateValue);
          console.log('✅ Date 객체 변환 성공:', result);
          return result;
        }

        // 숫자 타임스탬프인 경우 (혹시 모를 경우)
        if (typeof dateValue === 'number') {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) {
            throw new Error(`타임스탬프 변환 실패: ${dateValue}`);
          }
          return formatDateToMySQL(date);
        }

        throw new Error(`알 수 없는 날짜 형식: ${dateValue} (type: ${typeof dateValue})`);
      };

      let startDateStr: string;
      let endDateStr: string;

      try {
        startDateStr = convertDateToString(timetableRaw.start_date);
        console.log('✅ 시작일 변환 성공:', startDateStr);
      } catch (error: any) {
        console.error('❌ 시작일 변환 실패:', error.message);
        throw new Error(`시작일 변환 실패: ${error.message}. 원본: ${timetableRaw.start_date}`);
      }

      try {
        endDateStr = convertDateToString(timetableRaw.end_date);
        console.log('✅ 종료일 변환 성공:', endDateStr);
      } catch (error: any) {
        console.error('❌ 종료일 변환 실패:', error.message);
        throw new Error(`종료일 변환 실패: ${error.message}. 원본: ${timetableRaw.end_date}`);
      }

      // 최종 검증
      if (!startDateStr || startDateStr === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(startDateStr)) {
        console.error('❌ 시작일 최종 검증 실패:', startDateStr);
        throw new Error(`시작일이 유효하지 않습니다: "${startDateStr}"`);
      }

      if (!endDateStr || endDateStr === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
        console.error('❌ 종료일 최종 검증 실패:', endDateStr);
        throw new Error(`종료일이 유효하지 않습니다: "${endDateStr}"`);
      }

      // 날짜 범위 검증
      if (startDateStr > endDateStr) {
        console.error('❌ 날짜 범위 오류:', { startDateStr, endDateStr });
        throw new Error(`시작일이 종료일보다 늦습니다: ${startDateStr} > ${endDateStr}`);
      }

      // 파싱 테스트
      try {
        parseDateString(startDateStr);
        parseDateString(endDateStr);
        console.log('✅ 날짜 파싱 테스트 성공');
      } catch (error: any) {
        console.error('❌ 날짜 파싱 테스트 실패:', error.message);
        throw new Error(`날짜 파싱 테스트 실패: ${error.message}`);
      }

      // 이미 검증된 날짜 문자열 사용
      console.log('✅ 날짜 검증 완료:', {
        startDateStr,
        endDateStr,
      });

      // 2) 시간표 슬롯들 조회 (subject가 없어도 포함)
      const [slots] = await connection.query(
        `SELECT * FROM timetable_slots 
         WHERE timetable_id = ?`,
        [timetableId]
      ) as any[];

      const validSlots = Array.isArray(slots) ? slots.filter((slot: any) => 
        slot.grade && slot.class_number && slot.weekday && slot.period
      ) : [];

      if (validSlots.length === 0) {
        console.log('⚠️ 시간표 슬롯이 없습니다. 학사일정 기반으로만 진도표를 생성합니다.');
      } else {
        console.log(`📚 시간표 슬롯 수: ${validSlots.length}개 (subject가 없는 슬롯 포함)`);
      }

      // 3) 방학/휴일 날짜들 조회 (DATE_FORMAT으로 문자열로 조회)
      console.log('📅 방학/휴일 조회:', { startDateStr, endDateStr });
      
      const [holidays] = await connection.query(
        `SELECT DATE_FORMAT(event_date, '%Y-%m-%d') as event_date 
         FROM school_calendar 
         WHERE event_date BETWEEN ? AND ? 
         AND is_holiday = true`,
        [startDateStr, endDateStr]
      ) as any[];

      console.log('📅 조회된 방학/휴일:', JSON.stringify(holidays, null, 2));

      const holidayDates = new Set<string>();
      (holidays || []).forEach((h: any) => {
        const dateStr = h.event_date;
        if (dateStr && typeof dateStr === 'string') {
          const trimmed = dateStr.trim();
          if (trimmed && trimmed !== '0000-00-00' && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            holidayDates.add(trimmed);
          } else {
            console.warn('⚠️ 잘못된 방학 날짜 무시:', trimmed);
          }
        } else if (dateStr instanceof Date) {
          const dateStrFormatted = formatDateToMySQL(dateStr);
          holidayDates.add(dateStrFormatted);
        }
      });

      console.log('📅 방학/휴일 날짜 Set:', Array.from(holidayDates));

      // 4) 과목별 차시 카운터 초기화
      const lessonCounters: Record<string, number> = {};
      // key: "classroom-subject" 예: "101-화학"

      // 5) 날짜별로 수업 생성
      const lessonsToInsert: any[] = [];
      
      // 문자열 날짜를 Date 객체로 변환
      const parseDate = (dateStr: string): Date => {
        if (!dateStr || dateStr === '0000-00-00') {
          throw new Error(`잘못된 날짜 문자열: ${dateStr}`);
        }
        
        const parts = dateStr.split('-');
        if (parts.length !== 3) {
          throw new Error(`날짜 형식 오류: ${dateStr}`);
        }
        
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          throw new Error(`날짜 파싱 실패: ${dateStr}`);
        }
        
        if (year < 1900 || year > 2100) {
          throw new Error(`잘못된 연도: ${year}`);
        }
        if (month < 1 || month > 12) {
          throw new Error(`잘못된 월: ${month}`);
        }
        if (day < 1 || day > 31) {
          throw new Error(`잘못된 일: ${day}`);
        }
        
        const date = new Date(year, month - 1, day);
        if (isNaN(date.getTime())) {
          throw new Error(`잘못된 날짜: ${dateStr}`);
        }
        
        // 생성된 날짜가 원본과 일치하는지 확인
        if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
          throw new Error(`날짜 변환 오류: ${dateStr} -> ${date.toISOString()}`);
        }
        
        return date;
      };

      // 날짜를 YYYY-MM-DD 형식으로 변환하는 함수 (먼저 정의)
      const formatDate = (date: Date): string => {
        if (!date) {
          console.error('❌ formatDate: date가 null/undefined');
          throw new Error('Date 객체가 null/undefined입니다.');
        }
        
        if (!(date instanceof Date)) {
          console.error('❌ formatDate: Date 객체가 아님', typeof date, date);
          throw new Error(`Date 객체가 아닙니다. (type: ${typeof date})`);
        }
        
        if (isNaN(date.getTime())) {
          console.error('❌ formatDate: Invalid Date', date);
          throw new Error(`Invalid Date 객체: ${date}`);
        }
        
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        // NaN 체크
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          console.error('❌ formatDate: NaN 값 발견', { year, month, day, date: date.toISOString() });
          throw new Error(`날짜 값이 NaN입니다: year=${year}, month=${month}, day=${day}`);
        }
        
        // 유효성 검사
        if (year < 1900 || year > 2100) {
          console.error('❌ formatDate: 잘못된 연도', year);
          throw new Error(`잘못된 연도: ${year}`);
        }
        if (month < 1 || month > 12) {
          console.error('❌ formatDate: 잘못된 월', month);
          throw new Error(`잘못된 월: ${month}`);
        }
        if (day < 1 || day > 31) {
          console.error('❌ formatDate: 잘못된 일', day);
          throw new Error(`잘못된 일: ${day}`);
        }
        
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // 최종 유효성 검사
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          console.error('❌ formatDate: 날짜 포맷 오류', dateStr);
          throw new Error(`날짜 포맷 오류: ${dateStr}`);
        }
        
        // '0000-00-00' 체크
        if (dateStr === '0000-00-00') {
          console.error('❌ formatDate: 0000-00-00 변환됨', {
            date: date.toISOString(),
            year,
            month,
            day,
          });
          throw new Error('날짜가 0000-00-00으로 변환되었습니다.');
        }
        
        return dateStr;
      };

      // 날짜 처리 함수 사용 (파일 상단에 정의된 안전한 함수들)

      const compareDates = (dateStr1: string, dateStr2: string): number => {
        if (dateStr1 < dateStr2) return -1;
        if (dateStr1 > dateStr2) return 1;
        return 0;
      };

      console.log('📅 날짜 루프 시작:', {
        startDateStr,
        endDateStr,
        startDateStr_type: typeof startDateStr,
        endDateStr_type: typeof endDateStr,
      });

      // 시작일 재검증
      try {
        parseDateString(startDateStr);
        console.log('✅ 시작일 파싱 성공:', startDateStr);
      } catch (error: any) {
        console.error('❌ 시작일 파싱 실패:', error.message);
        throw new Error(`시작일 파싱 실패: ${error.message}`);
      }

      // 종료일 재검증
      try {
        parseDateString(endDateStr);
        console.log('✅ 종료일 파싱 성공:', endDateStr);
      } catch (error: any) {
        console.error('❌ 종료일 파싱 실패:', error.message);
        throw new Error(`종료일 파싱 실패: ${error.message}`);
      }

      let currentDateStr = startDateStr;
      let loopCount = 0;
      const maxLoops = 1000; // 무한 루프 방지

      console.log('🔄 날짜 루프 시작 - currentDateStr:', currentDateStr);

      while (compareDates(currentDateStr, endDateStr) <= 0 && loopCount < maxLoops) {
        loopCount++;
        
        // 날짜 유효성 검증
        if (!currentDateStr || currentDateStr === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(currentDateStr)) {
          const errorMsg = `잘못된 날짜 값 (루프 시작, ${loopCount}번째 반복): ${currentDateStr}. 시작일: ${startDateStr}, 종료일: ${endDateStr}`;
          console.error('❌ 루프 시작 시점 날짜 오류:', {
            currentDateStr,
            loopCount,
            startDateStr,
            endDateStr,
          });
          throw new Error(errorMsg);
        }
        
        // 날짜 파싱 테스트
        try {
          parseDateString(currentDateStr);
        } catch (error: any) {
          const errorMsg = `루프 내 날짜 파싱 실패 (${loopCount}번째 반복): ${error.message}. 날짜: ${currentDateStr}`;
          console.error('❌ 루프 내 날짜 파싱 실패:', {
            currentDateStr,
            loopCount,
            error: error.message,
          });
          throw new Error(errorMsg);
        }
        
        const weekday = getWeekdayFromDateString(currentDateStr); // 0=일, 1=월, ..., 6=토

        // 주말 제외 (월요일=1 ~ 금요일=5)
        if (weekday >= 1 && weekday <= 5) {
          // 방학/휴일 제외
          if (!holidayDates.has(currentDateStr)) {
            // 해당 요일의 슬롯들 찾기 (weekday: 1=월, 2=화, ..., 5=금)
            const daySlots = validSlots.filter((slot: any) => slot.weekday === weekday);

            if (daySlots.length > 0) {
              // 슬롯이 있는 경우: 각 슬롯에 대해 수업 생성
              daySlots.forEach((slot: any) => {
                // subject가 없어도 처리 가능하도록 수정
                const subjectValue = slot.subject ? String(slot.subject).trim() : '';
                const key = `${slot.grade}-${slot.class_number}-${slot.period}-${subjectValue || '미정'}`;

                if (!lessonCounters[key]) {
                  lessonCounters[key] = 1;
                }

                // 날짜 유효성 최종 검증
                if (!currentDateStr || currentDateStr === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(currentDateStr)) {
                  console.error('❌ 슬롯 처리 시점 날짜 오류:', {
                    currentDateStr,
                    slot,
                    loopCount
                  });
                  throw new Error(`잘못된 날짜 값 (슬롯 처리): ${currentDateStr}`);
                }

                // 필수 값 유효성 검증 (subject는 선택사항)
                if (!slot.grade || !slot.class_number || !slot.period) {
                  console.error('❌ 슬롯 데이터 오류:', slot);
                  throw new Error('시간표 슬롯 데이터가 불완전합니다. (grade, class_number, period는 필수)');
                }

                // 날짜 값 최종 검증
                const lessonDate = String(currentDateStr || '').trim();
                if (!lessonDate || lessonDate === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(lessonDate)) {
                  console.error('❌ lessonData 생성 전 날짜 오류:', {
                    currentDateStr,
                    lessonDate,
                    slot,
                    loopCount,
                  });
                  throw new Error(`lessonData 생성 전 날짜 검증 실패: "${lessonDate}"`);
                }

                // 날짜 파싱 테스트
                try {
                  parseDateString(lessonDate);
                } catch (error: any) {
                  console.error('❌ lessonData 날짜 파싱 실패:', {
                    lessonDate,
                    error: error.message,
                    slot,
                  });
                  throw new Error(`lessonData 날짜 파싱 실패: ${error.message}`);
                }

                const lessonData = [
                  lessonDate, // lesson_date (검증된 문자열)
                  Number(slot.grade), // grade
                  Number(slot.class_number), // class_number
                  Number(slot.period), // period
                  Number(lessonCounters[key]), // lesson_order
                  `${lessonCounters[key]}차시`, // lesson_title
                  subjectValue, // subject (빈 문자열이어도 가능)
                ];

                // INSERT 전 최종 검증
                const finalDateCheck = String(lessonData[0] || '').trim();
                if (!finalDateCheck || finalDateCheck === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(finalDateCheck)) {
                  console.error('❌ lessonData 최종 검증 실패:', {
                    lessonData,
                    finalDateCheck,
                    original: currentDateStr,
                    slot,
                  });
                  throw new Error(`lessonData 최종 검증 실패: "${finalDateCheck}"`);
                }

                lessonsToInsert.push(lessonData);
                lessonCounters[key]++;
              });
            } else {
              // 슬롯이 없는 경우: 학사일정 기반으로 날짜만 기록 (선택사항)
              // 이 경우는 lessons 테이블에 데이터를 생성하지 않음
              // 필요하다면 여기에 추가 로직을 넣을 수 있음
              console.log(`📅 ${currentDateStr}: 슬롯이 없어 수업 데이터를 생성하지 않습니다.`);
            }
          }
        }

        // 다음 날로 (안전한 날짜 증가 함수 사용)
        try {
          const previousDate = currentDateStr;
          currentDateStr = addDaysToDateString(currentDateStr, 1);
          
          // 날짜 유효성 확인
          if (!currentDateStr || currentDateStr === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(currentDateStr)) {
            throw new Error(`날짜 증가 실패: ${previousDate} -> ${currentDateStr}`);
          }
        } catch (error: any) {
          console.error('❌ 날짜 증가 오류:', {
            이전날짜: currentDateStr,
            loopCount,
            error: error.message,
          });
          throw new Error(`날짜 증가 중 오류 발생 (${loopCount}번째 반복): ${error.message}`);
        }
      }

      // 6) 기존 진도표 삭제 (해당 기간 및 잘못된 날짜 데이터)
      console.log('🗑️ 기존 진도표 삭제 중...');
      
      // 먼저 잘못된 날짜 데이터 확인 및 삭제
      const [badLessons] = await connection.query(
        `SELECT id, lesson_date, DATE_FORMAT(lesson_date, '%Y-%m-%d') as lesson_date_str
         FROM lessons
         WHERE lesson_date IS NULL
            OR DATE_FORMAT(lesson_date, '%Y-%m-%d') = '0000-00-00'
            OR lesson_date < '1900-01-01'`,
        []
      ) as any[];
      
      if (Array.isArray(badLessons) && badLessons.length > 0) {
        console.log(`⚠️ 잘못된 날짜 데이터 발견: ${badLessons.length}개`);
        console.log('📋 잘못된 데이터 샘플:', badLessons.slice(0, 5));
        
        // 잘못된 날짜 데이터 삭제
        await connection.query(
          `DELETE FROM lessons 
           WHERE lesson_date IS NULL
              OR DATE_FORMAT(lesson_date, '%Y-%m-%d') = '0000-00-00'
              OR lesson_date < '1900-01-01'`,
          []
        );
        console.log('✅ 잘못된 날짜 데이터 삭제 완료');
      }
      
      // 해당 기간의 기존 진도표 삭제
      await connection.query(
        'DELETE FROM lessons WHERE lesson_date BETWEEN ? AND ?',
        [startDateStr, endDateStr]
      );
      console.log('✅ 기존 진도표 삭제 완료');

      // 7) 새 진도표 bulk INSERT
      if (lessonsToInsert.length > 0) {
        console.log(`📊 생성된 수업 수: ${lessonsToInsert.length}`);
        console.log('📅 첫 번째 수업 날짜:', lessonsToInsert[0]?.[0]);
        console.log('📅 마지막 수업 날짜:', lessonsToInsert[lessonsToInsert.length - 1]?.[0]);

        // INSERT 전 최종 검증
        const invalidLessons: any[] = [];
        for (let i = 0; i < lessonsToInsert.length; i++) {
          const lesson = lessonsToInsert[i];
          if (!lesson[0] || lesson[0] === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(lesson[0])) {
            invalidLessons.push({ index: i, lesson, dateStr: lesson[0] });
          }
        }

        if (invalidLessons.length > 0) {
          console.error('❌ 잘못된 수업 데이터 발견:', invalidLessons);
          throw new Error(`${invalidLessons.length}개의 잘못된 날짜 값이 포함되어 있습니다. 첫 번째 오류: ${invalidLessons[0].dateStr}`);
        }

        // 샘플 데이터 출력 (처음 5개)
        console.log('📋 샘플 수업 데이터 (처음 5개):');
        lessonsToInsert.slice(0, 5).forEach((lesson, idx) => {
          console.log(`  ${idx + 1}. ${lesson[0]} - ${lesson[6]} (${lesson[3]}교시)`);
        });

        // 각 값을 개별적으로 검증하고 정리
        const validatedLessons: any[] = [];
        for (let i = 0; i < lessonsToInsert.length; i++) {
          const lesson = lessonsToInsert[i];
          
          // 각 필드 검증
          const lessonDate = String(lesson[0] || '').trim();
          const grade = Number(lesson[1]);
          const classNumber = Number(lesson[2]);
          const period = Number(lesson[3]);
          const lessonOrder = Number(lesson[4]);
          const lessonTitle = String(lesson[5] || '');
          const subject = String(lesson[6] || '');
          
          // 날짜 검증
          if (!lessonDate || lessonDate === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(lessonDate)) {
            console.error(`❌ 검증 실패 - 인덱스 ${i}:`, {
              원본: lesson,
              lessonDate,
              grade,
              classNumber,
              period,
            });
            throw new Error(`인덱스 ${i}의 날짜가 유효하지 않습니다: "${lessonDate}"`);
          }
          
          // 숫자 값 검증
          if (isNaN(grade) || isNaN(classNumber) || isNaN(period) || isNaN(lessonOrder)) {
            console.error(`❌ 숫자 값 오류 - 인덱스 ${i}:`, lesson);
            throw new Error(`인덱스 ${i}의 숫자 값이 유효하지 않습니다.`);
          }
          
          validatedLessons.push([
            lessonDate,
            grade,
            classNumber,
            period,
            lessonOrder,
            lessonTitle,
            subject,
          ]);
        }

        console.log(`✅ 검증 완료: ${validatedLessons.length}개 수업 데이터`);

        const placeholders = validatedLessons.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
        const query = `INSERT INTO lessons 
          (lesson_date, grade, class_number, period, lesson_order, lesson_title, subject) 
          VALUES ${placeholders}`;

        const flatValues = validatedLessons.flat();
        
        console.log('💾 INSERT 쿼리 실행 중...');
        console.log('📊 총 값 개수:', flatValues.length);
        console.log('📅 첫 번째 날짜 값:', flatValues[0]);
        console.log('📅 두 번째 날짜 값:', flatValues[7]);
        console.log('📅 세 번째 날짜 값:', flatValues[14]);
        
        // flatValues의 날짜 값들만 추출하여 검증
        const dateErrors: any[] = [];
        for (let i = 0; i < flatValues.length; i += 7) {
          const dateValue = String(flatValues[i] || '').trim();
          if (!dateValue || dateValue === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            dateErrors.push({
              index: i,
              dateValue,
              lessonIndex: Math.floor(i / 7),
              fullLesson: validatedLessons[Math.floor(i / 7)],
            });
          }
        }
        
        if (dateErrors.length > 0) {
          console.error('❌ flatValues 날짜 검증 실패:', dateErrors);
          throw new Error(`flatValues 배열에 ${dateErrors.length}개의 잘못된 날짜가 있습니다. 첫 번째: 인덱스 ${dateErrors[0].index}, 값: "${dateErrors[0].dateValue}"`);
        }
        
        // 최종 안전 검사: 모든 날짜 값이 유효한지 다시 한 번 확인
        const allDatesValid = flatValues.filter((_, idx) => idx % 7 === 0).every((date, idx) => {
          const dateStr = String(date || '').trim();
          const isValid = dateStr && dateStr !== '0000-00-00' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
          if (!isValid) {
            console.error(`❌ 최종 검증 실패 - 인덱스 ${idx * 7}:`, dateStr);
          }
          return isValid;
        });
        
        if (!allDatesValid) {
          throw new Error('최종 날짜 검증 실패: 하나 이상의 날짜가 유효하지 않습니다.');
        }
        
        console.log('✅ 모든 날짜 검증 통과');
        console.log('📝 INSERT 쿼리 실행...');
        console.log('📊 INSERT할 데이터 샘플 (처음 3개):');
        for (let i = 0; i < Math.min(3, validatedLessons.length); i++) {
          console.log(`  ${i + 1}.`, validatedLessons[i]);
        }
        
        // 실제 INSERT 전에 쿼리와 값을 로그로 출력
        console.log('🔍 INSERT 쿼리:', query.substring(0, 200) + '...');
        console.log('🔍 flatValues 길이:', flatValues.length);
        console.log('🔍 flatValues 처음 10개 값:', flatValues.slice(0, 10));
        
        // 실제로 MySQL에 전달되는 첫 번째 날짜 값 확인
        if (flatValues.length > 0) {
          const firstDate = flatValues[0];
          console.log('🔍 첫 번째 날짜 값 (타입, 값):', typeof firstDate, firstDate);
          if (String(firstDate) === '0000-00-00' || !firstDate) {
            throw new Error(`첫 번째 날짜 값이 유효하지 않습니다: "${firstDate}" (타입: ${typeof firstDate})`);
          }
        }
        
        // 작은 단위로 나누어 INSERT (디버깅용)
        if (validatedLessons.length > 0) {
          // 첫 번째 레코드만 먼저 테스트
          const testLesson = validatedLessons[0];
          
          console.log('🧪 테스트 INSERT 준비:');
          console.log('  원본 testLesson:', JSON.stringify(testLesson));
          console.log('  testLesson[0] 타입:', typeof testLesson[0], '값:', testLesson[0]);
          
          // 날짜 값을 명시적으로 문자열로 변환하고 검증
          let testDate = String(testLesson[0] || '').trim();
          console.log('  testDate 변환 후:', testDate, '타입:', typeof testDate);
          
          // null, undefined, 빈 문자열 체크
          if (!testDate || testDate === 'null' || testDate === 'undefined' || testDate === '') {
            console.error('❌ testDate가 비어있음:', testDate);
            throw new Error(`테스트 레코드의 날짜가 비어있습니다: "${testDate}"`);
          }
          
          // '0000-00-00' 체크
          if (testDate === '0000-00-00') {
            console.error('❌ testDate가 0000-00-00:', testDate);
            throw new Error(`테스트 레코드의 날짜가 0000-00-00입니다: "${testDate}"`);
          }
          
          // 형식 검증
          if (!/^\d{4}-\d{2}-\d{2}$/.test(testDate)) {
            console.error('❌ testDate 형식 오류:', testDate);
            throw new Error(`테스트 레코드의 날짜 형식이 잘못되었습니다: "${testDate}"`);
          }
          
          // 날짜 파싱 테스트
          try {
            parseDateString(testDate);
            console.log('✅ testDate 파싱 성공:', testDate);
          } catch (error: any) {
            console.error('❌ testDate 파싱 실패:', error.message);
            throw new Error(`testDate 파싱 실패: ${error.message}`);
          }
          
          const testQuery = `INSERT INTO lessons 
            (lesson_date, grade, class_number, period, lesson_order, lesson_title, subject) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`;
          
          const testValues = [
            testDate, // 검증된 문자열
            Number(testLesson[1]),
            Number(testLesson[2]),
            Number(testLesson[3]),
            Number(testLesson[4]),
            String(testLesson[5] || ''),
            String(testLesson[6] || ''),
          ];
          
          console.log('🧪 테스트 INSERT 실행:');
          console.log('  쿼리:', testQuery);
          console.log('  testValues:', JSON.stringify(testValues));
          console.log('  testValues[0]:', testValues[0], '타입:', typeof testValues[0]);
          console.log('  String(testValues[0]):', String(testValues[0]));
          
          // 최종 검증
          const finalTestDate = String(testValues[0] || '').trim();
          if (!finalTestDate || finalTestDate === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(finalTestDate)) {
            console.error('❌ 최종 검증 실패:', {
              finalTestDate,
              original: testDate,
              testValues,
            });
            throw new Error(`최종 검증 실패: "${finalTestDate}"`);
          }
          
          try {
            console.log('💾 MySQL 쿼리 실행 시작...');
            
            // INSERT 직전 최종 검증 (매우 상세하게)
            const finalCheckDate = testValues[0];
            console.log('🔍 INSERT 직전 최종 검증:');
            console.log('  finalCheckDate:', finalCheckDate);
            console.log('  typeof:', typeof finalCheckDate);
            console.log('  String(finalCheckDate):', String(finalCheckDate));
            console.log('  === "0000-00-00":', String(finalCheckDate) === '0000-00-00');
            console.log('  정규식 테스트:', /^\d{4}-\d{2}-\d{2}$/.test(String(finalCheckDate)));
            
            if (!finalCheckDate || String(finalCheckDate) === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(String(finalCheckDate))) {
              console.error('❌ INSERT 직전 검증 실패!');
              throw new Error(`INSERT 직전 검증 실패: "${finalCheckDate}" (타입: ${typeof finalCheckDate})`);
            }
            
            // testValues 배열의 각 값을 개별적으로 검증
            console.log('🔍 testValues 배열 개별 검증:');
            testValues.forEach((val, idx) => {
              console.log(`  [${idx}]:`, val, '타입:', typeof val);
              if (idx === 0 && (String(val) === '0000-00-00' || !val)) {
                throw new Error(`testValues[0]이 유효하지 않습니다: "${val}"`);
              }
            });
            
          // MySQL에 전달하기 전에 값 복사 (원본 보호)
          // 날짜 값을 매우 명확하게 처리
          let finalDateValue = String(testValues[0] || '').trim();
          
          // 최종 검증
          if (!finalDateValue || finalDateValue === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(finalDateValue)) {
            console.error('❌ finalDateValue 검증 실패:', {
              finalDateValue,
              원본: testValues[0],
              타입: typeof testValues[0],
            });
            throw new Error(`finalDateValue가 유효하지 않습니다: "${finalDateValue}"`);
          }
          
          // 날짜 파싱 테스트
          try {
            parseDateString(finalDateValue);
          } catch (error: any) {
            console.error('❌ finalDateValue 파싱 실패:', error.message);
            throw new Error(`finalDateValue 파싱 실패: ${error.message}`);
          }
          
          const safeTestValues = [
            finalDateValue, // 검증된 날짜 문자열
            Number(testValues[1]),
            Number(testValues[2]),
            Number(testValues[3]),
            Number(testValues[4]),
            String(testValues[5] || ''),
            String(testValues[6] || ''),
          ];
          
          console.log('🔍 safeTestValues 생성 완료:');
          console.log('  배열:', JSON.stringify(safeTestValues));
          console.log('  [0] 날짜:', safeTestValues[0], '타입:', typeof safeTestValues[0]);
          console.log('  [0] String변환:', String(safeTestValues[0]));
          console.log('  [0] === "0000-00-00":', String(safeTestValues[0]) === '0000-00-00');
          
          // safeTestValues도 최종 검증
          const finalCheck = String(safeTestValues[0] || '').trim();
          if (!finalCheck || finalCheck === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(finalCheck)) {
            console.error('❌ safeTestValues 최종 검증 실패:', {
              finalCheck,
              safeTestValues,
            });
            throw new Error(`safeTestValues[0]이 유효하지 않습니다: "${finalCheck}"`);
          }
            
            // MySQL에 실제로 전달되는 값을 확인하기 위해 쿼리 문자열 생성
            const queryString = testQuery.replace(/\?/g, (match, offset) => {
              const index = testQuery.substring(0, offset).split('?').length - 1;
              const value = safeTestValues[index];
              if (typeof value === 'string') {
                return `'${value}'`;
              }
              return String(value);
            });
            console.log('🔍 실제 실행될 쿼리:', queryString);
            console.log('🔍 safeTestValues 배열:', safeTestValues);
            console.log('🔍 safeTestValues[0] 상세:', {
              값: safeTestValues[0],
              타입: typeof safeTestValues[0],
              String변환: String(safeTestValues[0]),
              길이: String(safeTestValues[0]).length,
              JSON: JSON.stringify(safeTestValues[0]),
            });
            
            await connection.query(testQuery, safeTestValues);
            console.log('✅ 테스트 INSERT 성공');
            
            // 테스트 레코드 삭제
            await connection.query('DELETE FROM lessons WHERE lesson_date = ? AND grade = ? AND class_number = ? AND period = ?', 
              [safeTestValues[0], safeTestValues[1], safeTestValues[2], safeTestValues[3]]);
            console.log('🗑️ 테스트 레코드 삭제 완료');
          } catch (testError: any) {
            console.error('❌ 테스트 INSERT 실패:');
            console.error('  에러 메시지:', testError.message);
            console.error('  testQuery:', testQuery);
            console.error('  원본 testValues:', JSON.stringify(testValues));
            console.error('  testValues[0]:', testValues[0], '타입:', typeof testValues[0]);
            console.error('  String(testValues[0]):', String(testValues[0]));
            throw new Error(`테스트 INSERT 실패: ${testError.message}. 쿼리: ${testQuery}, 값: ${JSON.stringify(testValues)}`);
          }
        }
        
        // 전체 INSERT 실행 전 최종 검증
        console.log('🔍 INSERT 직전 최종 검증 시작...');
        
        // flatValues의 모든 날짜 값 재검증
        const finalDateCheckErrors: any[] = [];
        for (let i = 0; i < flatValues.length; i += 7) {
          const dateValue = flatValues[i];
          const dateStr = String(dateValue || '').trim();
          
          // 날짜 값 검증
          if (!dateStr || dateStr === '0000-00-00' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            finalDateCheckErrors.push({
              index: i,
              dateValue: dateStr,
              lessonIndex: Math.floor(i / 7),
              fullLesson: validatedLessons[Math.floor(i / 7)],
            });
          } else {
            // 날짜 파싱 테스트
            try {
              parseDateString(dateStr);
            } catch (error: any) {
              finalDateCheckErrors.push({
                index: i,
                dateValue: dateStr,
                error: error.message,
                lessonIndex: Math.floor(i / 7),
              });
            }
          }
        }
        
        if (finalDateCheckErrors.length > 0) {
          console.error('❌ INSERT 직전 최종 검증 실패:', finalDateCheckErrors);
          throw new Error(`INSERT 직전 검증 실패: ${finalDateCheckErrors.length}개의 잘못된 날짜가 발견되었습니다. 첫 번째 오류: 인덱스 ${finalDateCheckErrors[0].index}, 값: "${finalDateCheckErrors[0].dateValue}"`);
        }
        
        console.log('✅ INSERT 직전 최종 검증 통과');
        console.log('💾 전체 INSERT 실행 중...');
        
        // 전체 INSERT 실행
        await connection.query(query, flatValues);
        console.log('✅ INSERT 완료');
      }

      // 8) commit
      await connection.commit();

      // 성공 메시지 생성
      let successMessage = '';
      if (lessonsToInsert.length === 0) {
        if (validSlots.length === 0) {
          successMessage = '시간표 슬롯이 없어 수업 데이터를 생성하지 않았습니다. (학사일정 기반으로 날짜 범위만 확인됨)';
        } else {
          successMessage = '해당 기간에 생성할 수업이 없습니다. (주말 및 휴일 제외)';
        }
      } else {
        successMessage = `${lessonsToInsert.length}개의 수업이 생성되었습니다.`;
      }

      return NextResponse.json({
        success: true,
        count: lessonsToInsert.length,
        message: successMessage,
      });
    } catch (error: any) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    connection.release();
    
    // 상세한 에러 정보를 응답에 포함
    const errorMessage = error.message || '진도표 생성 중 오류가 발생했습니다.';
    console.error('❌ 진도표 생성 오류:', {
      message: errorMessage,
      stack: error.stack,
      name: error.name,
    });
    
    // '0000-00-00' 오류인 경우 더 상세한 정보 제공
    let enhancedError = errorMessage;
    if (errorMessage.includes('0000-00-00')) {
      enhancedError = `${errorMessage}\n\n가능한 원인:\n1. 시간표의 시작일/종료일이 잘못되었을 수 있습니다.\n2. 날짜 변환 과정에서 오류가 발생했을 수 있습니다.\n3. 데이터베이스에 저장된 날짜 형식이 올바르지 않을 수 있습니다.\n\n해결 방법:\n- 시간표를 삭제하고 다시 생성해보세요.\n- MySQL Workbench에서 timetables 테이블의 날짜 값을 확인하세요.`;
    }
    
    return NextResponse.json(
      {
        success: false,
        error: enhancedError,
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          name: error.name,
          originalMessage: errorMessage,
        } : undefined,
      },
      { status: 500 }
    );
  }
}

