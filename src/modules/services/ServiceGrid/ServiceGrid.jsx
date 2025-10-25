'use client';

import { useState } from 'react';
import ServiceCard from '@/components/cards/ServiceCard/ServiceCard';
import styles from './ServiceGrid.module.scss';

/**
 * ServiceGrid Component
 * 
 * Displays a responsive grid of service cards fetched from Strapi.
 * Handles empty state when no services are available.
 * 
 * Grid Layout:
 * - Desktop (>960px): 4 columns
 * - Tablet (768px-960px): 3 columns
 * - Mobile (<768px): 2 columns
 * 
 * @param {Array} initialServices - Initial services data from server-side fetch
 */
const ServiceGrid = ({ initialServices }) => {
  // State to hold services data (allows for future client-side updates if needed)
  const [services] = useState(initialServices || []);
  
  /**
   * Empty State Rendering
   * Displays a message when no services are available
   */
  if (!services || services.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyState__message}>
          در حال حاضر هیچ خدمتی ثبت نشده است.
        </p>
      </div>
    );
  }

  /**
   * Main Grid Rendering
   * Maps through services array and renders ServiceCard for each item
   */
  return (
    <div className={styles.serviceGrid}>
      {/* Responsive grid container with automatic column adjustments */}
      <div className={styles.serviceGrid__container}>
        {services.map((service) => (
          <ServiceCard 
            key={service.id} 
            service={service} 
          />
        ))}
      </div>
    </div>
  );
};

export default ServiceGrid;

