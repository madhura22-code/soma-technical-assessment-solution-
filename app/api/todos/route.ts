import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { searchPexelsImage, getFallbackImage } from '@/lib/pexels';
import { hasCircularDependency, type TodoWithDependencies } from '@/lib/dependencies';

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(todos);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching todos' }, { status: 500 });
  }
}

async function processDueDate(dueDateString: string): Promise<Date> {
  if (!dueDateString) {
    throw new Error('Due date is required');
  }
  
  try {
    const dueDate = new Date(dueDateString);
    
    // Validate that it's a valid date
    if (isNaN(dueDate.getTime())) {
      throw new Error('Invalid date format');
    }
    
    return dueDate;
  } catch (error) {
    console.error('Error processing due date:', error);
    throw error;
  }
}

async function getImageForTodo(title: string): Promise<string> {
  try {
    // Try to get image from Pexels API
    const imageUrl = await searchPexelsImage(title);
    if (imageUrl) {
      return imageUrl;
    }
    
    // Fallback to predefined images if Pexels API fails or returns no results
    return getFallbackImage(title);
  } catch (error) {
    console.error('Error getting image for todo:', error);
    // Return fallback image even if there's an error
    return getFallbackImage(title);
  }
}

export async function POST(request: Request) {
  try {
    const { title, dueDate, dependencies, duration } = await request.json();
    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    if (!dueDate) {
      return NextResponse.json({ error: 'Due date is required' }, { status: 400 });
    }
    
    const processedDueDate = await processDueDate(dueDate);
    
    // Get relevant image for the todo
    const imageUrl = await getImageForTodo(title.trim());
    
    const todo = await prisma.todo.create({
      data: {
        title,
        dueDate: processedDueDate,
        imageUrl,
        ...(dependencies && { dependencies: JSON.stringify(dependencies) }),
        ...(duration && { duration: parseInt(duration.toString()) }),
      } as any,
    });
    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Due date')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error creating todo' }, { status: 500 });
  }
}