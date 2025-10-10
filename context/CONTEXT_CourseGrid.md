# Feature Context: CourseGrid Client Component

## 1. Goal
Create an interactive grid for courses with sorting and "load more" functionality.

## 2. Files
- Folder: `src/modules/courses/CourseGrid`
- File: `src/modules/courses/CourseGrid/CourseGrid.jsx`

## 3. JSX (`CourseGrid.jsx`)
```jsx
'use client';
import { useState, useEffect } from 'react';
import CourseCard from '@/components/cards/CourseCard/CourseCard';
import { formatStrapiCourses } from '@/lib/strapiUtils';
import styles from '../../articles/ArticleGrid/ArticleGrid.module.scss'; // Reusing styles

const PAGE_SIZE = 6;

const CourseGrid = ({ initialCourses }) => {
  const [courses, setCourses] = useState(initialCourses || []);
  const [sortBy, setSortBy] = useState('latest');
  // ... (rest of the logic is identical to ArticleGrid, just replace 'article' with 'course')

  // NOTE to AI: Implement the full state and fetch logic for sorting and load more,
  // exactly like the ArticleGrid component, but for courses.
  // The fetch URL should be `/api/courses`.
  // Sort options can be 'latest' (createdAt:desc) and 'price:asc', 'price:desc'.

  return (
    <div>
       {/* Sorting controls UI */}
       <div className={styles.grid}>
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
       {/* Load more button UI */}
    </div>
  );
};
export default CourseGrid;