## Soma Capital Technical Assessment

This is a technical assessment as part of the interview process for Soma Capital.

> [!IMPORTANT]  
> You will need a Pexels API key to complete the technical assessment portion of the application. You can sign up for a free API key at https://www.pexels.com/api/  

To begin, clone this repository to your local machine.

## Development

This is a [NextJS](https://nextjs.org) app, with a SQLite based backend, intended to be run with the LTS version of Node.

To run the development server:

```bash
npm i
npm run dev
```

## Task:

Modify the code to add support for due dates, image previews, and task dependencies.

### Part 1: Due Dates 

When a new task is created, users should be able to set a due date.

When showing the task list is shown, it must display the due date, and if the date is past the current time, the due date should be in red.

### Part 2: Image Generation 

When a todo is created, search for and display a relevant image to visualize the task to be done. 

To do this, make a request to the [Pexels API](https://www.pexels.com/api/) using the task description as a search query. Display the returned image to the user within the appropriate todo item. While the image is being loaded, indicate a loading state.

You will need to sign up for a free Pexels API key to make the fetch request. 

### Part 3: Task Dependencies

Implement a task dependency system that allows tasks to depend on other tasks. The system must:

1. Allow tasks to have multiple dependencies
2. Prevent circular dependencies
3. Show the critical path
4. Calculate the earliest possible start date for each task based on its dependencies
5. Visualize the dependency graph

## Submission:

1. Add a new "Solution" section to this README with a description and screenshot or recording of your solution. 
2. Push your changes to a public GitHub repository.
3. Submit a link to your repository in the application form.

Thanks for your time and effort. We'll be in touch soon!

## Solution

This solution implements a comprehensive task management system with advanced features including due dates, image visualization, and sophisticated task dependency management with critical path analysis.

### Part 1: Due Dates ✅

**Implementation:**
- **Database Schema**: Extended the `Todo` model in `prisma/schema.prisma` to include a `dueDate` field of type `DateTime?`
- **Form Input**: Added a date picker input in the task creation form (`app/page.tsx`)
- **API Integration**: Modified the POST endpoint in `app/api/todos/route.ts` to handle due date validation and processing
- **Visual Indicators**: Implemented conditional styling to display overdue tasks in red

**Key Features:**
-  Date picker for setting due dates during task creation
-  Due date display in task list with formatted date (e.g., "Dec 15, 2024")
-  **Red highlighting** for overdue tasks with "(Overdue)" indicator
-  Smart date formatting using `toLocaleDateString()` for better UX
-  Due date validation to ensure tasks have required dates

**Technical Implementation:**
```typescript
// Overdue detection logic
const isOverdue = (dueDate: string) => {
  return new Date(dueDate) < new Date();
};

// Conditional styling for overdue tasks
className={`text-sm mt-1 ${
  isOverdue(new Date(todo.dueDate).toISOString()) 
    ? 'text-red-600 font-semibold' 
    : 'text-gray-600'
}`}
```

### Part 2: Image Generation ✅

**Implementation:**
- **Pexels API Integration**: Created image fetching service in `app/api/todos/route.ts`
- **Automatic Image Search**: Uses task title as search query to find relevant images
- **Loading States**: Implemented spinner animations while images load
- **Error Handling**: Graceful fallback when images fail to load
- **Optimized Display**: Uses Next.js Image component for performance

**Key Features:**
-  **Automatic image search** using Pexels API based on task description
-  **Loading indicators** with spinning animation during image fetch
-  **Responsive image display** (64x64px thumbnails)
-  **Error handling** for failed image loads
-  **Performance optimization** with Next.js Image component

**Technical Implementation:**
```typescript
// Image fetching service
const getImageForTodo = async (title: string): Promise<string | null> => {
  const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(title)}&per_page=1`,
    { headers: { 'Authorization': PEXELS_API_KEY } }
  );
  // Returns optimized image URL
};
```

### Part 3: Task Dependencies ✅

**Implementation:**
- **Advanced Dependency System**: Complete task dependency management with circular dependency prevention
- **Critical Path Analysis**: Implements longest path algorithm to identify critical tasks
- **Interactive Dependency Graph**: Canvas-based visualization with animations and hover effects
- **Earliest Start Date Calculation**: Calculates optimal task scheduling based on dependencies
- **Topological Sorting**: Ensures proper task ordering based on dependencies

**Key Features:**

#### 3.1 Multiple Dependencies ✅
-  **Checkbox interface** for selecting multiple task dependencies
-  **JSON storage** of dependency relationships in database
-  **Visual dependency indicators** with blue badges showing dependent tasks
-  **Bidirectional relationship display** (depends on / blocks)

#### 3.2 Circular Dependency Prevention ✅
-  **Depth-First Search (DFS)** algorithm to detect cycles
-  **Real-time validation** during dependency selection
-  **User-friendly error prevention** (dependencies automatically filtered)

**Technical Implementation:**
```typescript
// Circular dependency detection using DFS
export function hasCircularDependency(todos: TodoWithDependencies[], newTodo: { id?: number; dependencies: number[] }): boolean {
  const visited = new Set<number>();
  const recursionStack = new Set<number>();
  
  function hasCycle(nodeId: number): boolean {
    if (recursionStack.has(nodeId)) return true; // Cycle detected
    // ... DFS implementation
  }
}
```

#### 3.3 Critical Path Analysis ✅
-  **Longest path algorithm** to identify critical tasks
-  **Visual highlighting** of critical path tasks in red
-  **Animated flow indicators** showing task sequence
-  **Critical path statistics** in dependency graph

**Technical Implementation:**
```typescript
// Critical path calculation
function findCriticalPath(todos: TodoWithDependencies[], earliestStart: Map<number, Date>, completionTime: Map<number, Date>): number[] {
  // Find task with latest completion time
  let endTask = findLatestCompletionTask(completionTime);
  
  // Trace back through critical dependencies
  return traceBackCriticalPath(endTask, todos, earliestStart, completionTime);
}
```

#### 3.4 Earliest Start Date Calculation ✅
-  **Topological sorting** for proper task ordering
-  **Dynamic start date calculation** based on dependency completion
-  **Duration-based scheduling** (supports hour-based task durations)
-  **Real-time updates** when dependencies change

**Technical Implementation:**
```typescript
// Earliest start date calculation
sortedIds.forEach(todoId => {
  const deps = parseDependencies(todo.dependencies);
  let maxCompletionTime = new Date();
  
  // Find latest completion time of all dependencies
  deps.forEach(depId => {
    const depCompletionTime = completionTime.get(depId);
    if (depCompletionTime && depCompletionTime > maxCompletionTime) {
      maxCompletionTime = depCompletionTime;
    }
  });
  
  earliestStart.set(todoId, maxCompletionTime);
});
```

#### 3.5 Interactive Dependency Graph ✅
-  **Canvas-based visualization** with smooth animations
-  **Hierarchical layout** organized by dependency levels
-  **Enhanced edge styling** with gradients and curves
-  **Interactive hover effects** with glow animations
-  **Animated flow dots** on critical path edges

**Advanced Graph Features:**
- **Bézier curve edges** for smooth, professional appearance
- **Gradient color schemes** (blue for regular, red for critical path)
- **Real-time hover highlighting** of connected nodes
- **Animated flow indicators** showing task sequence direction
- **Level-based organization** with clear visual hierarchy
- **Responsive design** with proper scaling and bounds checking

### Additional Enhancements ✨

**UI/UX Improvements:**
-  **Enhanced form styling** with better visibility for duration input
-  **Black text for numbers** in both input fields and task display
-  **Professional color scheme** with indigo accents
-  **Responsive design** that works on different screen sizes
-  **Loading states** and error handling throughout
-  **Smooth animations** and transitions

**Technical Architecture:**
-  **Type-safe TypeScript** implementation throughout
-  **Prisma ORM** for database management
-  **Next.js API routes** for backend functionality
-  **Modular code structure** with separate utility functions
-  **Performance optimizations** with proper caching and image handling

**Database Design:**
```sql
model Todo {
  id           Int      @id @default(autoincrement())
  title        String
  createdAt    DateTime @default(now())
  dueDate      DateTime?
  imageUrl     String?
  dependencies String?  // JSON array of task IDs
  duration     Int?     // Duration in hours
}
```


image.png