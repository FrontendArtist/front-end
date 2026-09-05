'use client';

import React from 'react';

/**
 * کامپوننت سمت کلاینت تیزر معرفی دوره با حفاظت از دانلود و کلیک راست
 */
export default function CourseTeaserPlayer({ src, poster }) {
  return (
    <video
      src={src}
      controls
      controlsList="nodownload"
      disablePictureInPicture
      onContextMenu={(e) => e.preventDefault()}
      poster={poster}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}
