interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
  total_results: number;
  page: number;
  per_page: number;
  prev_page?: string;
  next_page?: string;
}

export async function searchPexelsImage(query: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  
  if (!apiKey) {
    console.error('Pexels API key not found in environment variables');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
      {
        headers: {
          'Authorization': apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
    }

    const data: PexelsResponse = await response.json();
    
    if (data.photos && data.photos.length > 0) {
      // Return the medium size image URL for better performance
      return data.photos[0].src.medium;
    }
    
    return null;
  } catch (error) {
    console.error('Error searching Pexels:', error);
    return null;
  }
}

// Fallback image URLs for common task categories
const fallbackImages = {
  'work': 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=400',
  'study': 'https://images.pexels.com/photos/5905709/pexels-photo-5905709.jpeg?auto=compress&cs=tinysrgb&w=400',
  'exercise': 'https://images.pexels.com/photos/4056530/pexels-photo-4056530.jpeg?auto=compress&cs=tinysrgb&w=400',
  'cook': 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
  'clean': 'https://images.pexels.com/photos/4107285/pexels-photo-4107285.jpeg?auto=compress&cs=tinysrgb&w=400',
  'shopping': 'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=400',
  'default': 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=400'
};

export function getFallbackImage(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  for (const [category, imageUrl] of Object.entries(fallbackImages)) {
    if (lowerQuery.includes(category)) {
      return imageUrl;
    }
  }
  
  return fallbackImages.default;
} 