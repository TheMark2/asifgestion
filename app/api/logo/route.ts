import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const logoPath = join(process.cwd(), 'public', 'logo.png');
    const logoBuffer = readFileSync(logoPath);
    const logoBase64 = logoBuffer.toString('base64');
    
    return NextResponse.json({
      logo: `data:image/png;base64,${logoBase64}`
    });
  } catch (error) {
    console.error('Error loading logo:', error);
    return NextResponse.json(
      { error: 'Error loading logo' },
      { status: 500 }
    );
  }
} 
 
 