'use client';

import { useEffect, useState } from 'react';
import { apiClient } from './api';
import type { CourseCardData } from '../components/course/course-card';

let pending: Promise<CourseCardData[]> | null = null;

/** Loads the public course catalogue once per page load and shares it between components. */
export function loadCatalog(): Promise<CourseCardData[]> {
  if (!pending) {
    pending = apiClient<{ items: CourseCardData[] }>('/courses?limit=100')
      .then((res) => res.items || [])
      .catch(() => {
        pending = null;
        return [];
      });
  }
  return pending;
}

export function useCatalog(): CourseCardData[] | null {
  const [courses, setCourses] = useState<CourseCardData[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadCatalog().then((c) => alive && setCourses(c));
    return () => {
      alive = false;
    };
  }, []);
  return courses;
}

/** Category names with course counts, most courses first. */
export function categoriesOf(courses: CourseCardData[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of courses) if (c.category) counts.set(c.category, (counts.get(c.category) || 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
