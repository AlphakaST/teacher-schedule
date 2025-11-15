import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import openai from '@/lib/openai';

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    // OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // FormData 파싱
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 업로드되지 않았습니다.' },
        { status: 400 }
      );
    }

    // PDF 파일인지 확인
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { success: false, error: 'PDF 파일만 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    // 파일을 Buffer로 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Vercel 서버리스 환경에서는 /tmp 디렉토리 사용
    // 로컬 개발 환경에서는 public/uploads 사용
    const isVercel = process.env.VERCEL === '1';
    const uploadsDir = isVercel 
      ? '/tmp' 
      : join(process.cwd(), 'public', 'uploads');
    
    if (!isVercel && !existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // 임시 파일로 저장
    const timestamp = Date.now();
    // 파일명에서 특수문자만 제거 (한글은 유지)
    const originalName = file.name.replace(/[<>:"|?*]/g, '_').replace(/\s+/g, '_');
    tempFilePath = join(uploadsDir, `${timestamp}-${originalName}`);
    
    await writeFile(tempFilePath, buffer);

    // PDF 텍스트 추출
    let pdfText: string;
    try {
      // pdf-parse v2 API 사용
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PDFParse } = require('pdf-parse');
      
      if (typeof PDFParse !== 'function') {
        throw new Error('PDFParse 클래스를 로드할 수 없습니다.');
      }
      
      // PDFParse 인스턴스 생성 및 텍스트 추출
      // pdf-parse v2에서는 buffer를 'data' 파라미터로 전달
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      pdfText = result.text;
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: `PDF 파싱 실패: ${error.message}` },
        { status: 400 }
      );
    }

    if (!pdfText || pdfText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'PDF에서 텍스트를 추출할 수 없습니다.' },
        { status: 400 }
      );
    }

    // GPT API 호출 (최대 2번 재시도)
    let events: any[] = [];
    let lastError: any = null;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-5-nano',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                '당신은 학교 학사일정 PDF를 분석하는 전문가입니다. 다양한 형식의 학사일정(표 형식, 리스트 형식 등)을 정확하게 파싱합니다.',
            },
            {
              role: 'user',
              content: `다음은 학교 학사일정 PDF에서 추출한 텍스트입니다.
이 텍스트를 분석해서 학사일정을 추출하고, 다음 JSON 형식으로 반환해주세요:

{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "title": "일정 제목",
      "is_holiday": true/false
    }
  ]
}

추출 규칙:
1. date는 반드시 YYYY-MM-DD 형식으로 변환 (2025년도 일정)
2. title은 한글로 명확하게 (예: "시업식", "입학식", "여름방학", "중간고사")
3. is_holiday는 다음의 경우 true:
   - 방학 (여름방학, 겨울방학)
   - 공휴일 (어린이날, 현충일, 개천절, 한글날, 크리스마스, 신정 등)
   - 재량휴업일, 대체공휴일
4. 다음 일정들은 반드시 포함:
   - 시업식, 입학식, 개학, 종업식, 졸업식, 방학식
   - 중간고사, 기말고사
   - 현장체험학습, 수련활동
   - 학부모총회, 수업공개
   - 체육대회, 축제
5. 학년별 개별 일정은 제외 (전체 학교 공통 일정만)
6. 날짜가 불명확하거나 중요하지 않은 일정은 제외
7. 날짜 범위 일정(예: "3.10~3.14")은 시작일과 종료일 각각 생성

텍스트:
${pdfText}`,
            },
          ],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('GPT 응답이 비어있습니다.');
        }

        // JSON 파싱
        let parsedData: any;
        try {
          parsedData = JSON.parse(content);
        } catch (parseError) {
          throw new Error(`JSON 파싱 실패: ${parseError}`);
        }

        // events 배열 확인
        if (!parsedData.events || !Array.isArray(parsedData.events)) {
          throw new Error('events 배열이 없습니다.');
        }

        events = parsedData.events;
        break; // 성공하면 루프 종료
      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries) {
          // 재시도 전 잠시 대기
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }

    // 날짜 형식 검증 및 필터링
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const validEvents = events.filter((event) => {
      if (!event.date || !dateRegex.test(event.date)) {
        return false;
      }
      // 날짜 유효성 검사
      const date = new Date(event.date);
      if (isNaN(date.getTime())) {
        return false;
      }
      return true;
    });

    // 중복 날짜 제거 (같은 날짜면 is_holiday가 true인 것 우선)
    const eventMap = new Map<string, any>();
    for (const event of validEvents) {
      const existing = eventMap.get(event.date);
      if (!existing || (event.is_holiday && !existing.is_holiday)) {
        eventMap.set(event.date, event);
      }
    }

    const uniqueEvents = Array.from(eventMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // 임시 파일 삭제
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (error) {
        // 파일 삭제 실패는 무시
        console.error('임시 파일 삭제 실패:', error);
      }
    }

    return NextResponse.json({
      success: true,
      events: uniqueEvents,
      rawText: pdfText.substring(0, 1000),
    });
  } catch (error: any) {
    // 임시 파일 삭제
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (unlinkError) {
        // 무시
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || '알 수 없는 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}

