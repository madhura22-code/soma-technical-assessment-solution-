import { NextRequest, NextResponse } from 'next/server';
import { searchPexelsImage, getFallbackImage } from '@/lib/pexels';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' }, 
        { status: 400 }
      );
    }

    // Try to get image from Pexels API
    const imageUrl = await searchPexelsImage(query.trim());
    
    if (imageUrl) {
      return NextResponse.json({ 
        imageUrl,
        source: 'pexels',
        query: query.trim()
      });
    }
    
    // Fallback to predefined images if Pexels API fails or returns no results
    const fallbackUrl = getFallbackImage(query.trim());
    
    return NextResponse.json({ 
      imageUrl: fallbackUrl,
      source: 'fallback',
      query: query.trim()
    });
    
  } catch (error) {
    console.error('Error in search-image API:', error);
    
    // Return fallback image even if there's an error
    const fallbackUrl = getFallbackImage('default');
    
    return NextResponse.json({ 
      imageUrl: fallbackUrl,
      source: 'fallback',
      error: 'Failed to search images',
      query: 'default'
    }, { status: 500 });
  }
} 