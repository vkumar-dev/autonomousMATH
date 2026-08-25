/**
 * Time Formatter Utilities
 * Handles date/time formatting and relative time display
 */

class TimeFormatter {
  /**
   * Get relative time string (e.g., "5 minutes ago", "2 days ago")
   * @param {string|Date} dateString - ISO date string or Date object
   * @returns {string} - Relative time description
   */
  static getRelativeTime(dateString) {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Less than 1 minute
      if (diffMins < 1) {
        return 'just now';
      }

      // Less than 1 hour - show minutes
      if (diffHours < 1) {
        return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
      }

      // Less than 48 hours - show hours
      if (diffHours < 48) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      }

      // 48 hours or more - show days
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } catch (error) {
      console.warn('Error formatting relative time:', error);
      return 'unknown time';
    }
  }

  /**
   * Format date with time
   * @param {string|Date} dateString - ISO date string or Date object
   * @param {string} format - 'full' | 'date-time' | 'date-only'
   * @returns {string} - Formatted date
   */
  static formatDateTime(dateString, format = 'date-time') {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };

      if (format !== 'date-only') {
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.second = '2-digit';
        options.timeZone = 'UTC';
      }

      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'unknown date';
    }
  }

  /**
   * Get full date-time with relative time
   * @param {string|Date} dateString - ISO date string or Date object
   * @returns {object} - { dateTime: string, relativeTime: string, fullText: string }
   */
  static getFullTimeInfo(dateString) {
    const dateTime = this.formatDateTime(dateString, 'date-time');
    const relativeTime = this.getRelativeTime(dateString);

    return {
      dateTime,
      relativeTime,
      fullText: `Generated ${relativeTime}`
    };
  }
}

// Export for use in scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimeFormatter;
}
