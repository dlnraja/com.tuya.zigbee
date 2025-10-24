/**
 * MICRO-MODULE: DATA MERGER
 * 
 * Fusionne intelligemment les données de plusieurs sources
 */

export class DataMerger {
  constructor(options = {}) {
    this.prioritySources = options.prioritySources || [
      'zigbee2mqtt',
      'github-koenkk',
      'blakadder',
      'home-assistant',
      'github-johan-bendz'
    ];
  }

  /**
   * Merge manufacturer data from multiple sources
   */
  merge(existing, newData, source) {
    // If no existing data, use new data
    if (!existing) {
      return {
        ...newData,
        source,
        sources: [source],
        addedDate: new Date().toISOString()
      };
    }

    // Merge data intelligently
    const merged = { ...existing };
    
    // Add source if not already present
    if (!merged.sources) {
      merged.sources = [merged.source];
    }
    if (!merged.sources.includes(source)) {
      merged.sources.push(source);
    }

    // Update fields based on priority
    const existingPriority = this.getSourcePriority(merged.source);
    const newPriority = this.getSourcePriority(source);

    if (newPriority < existingPriority) {
      // New source has higher priority
      if (newData.vendor && !merged.vendor) merged.vendor = newData.vendor;
      if (newData.model && !merged.model) merged.model = newData.model;
      if (newData.description && !merged.description) merged.description = newData.description;
      if (newData.category && (!merged.category || merged.category === 'unknown')) {
        merged.category = newData.category;
      }
      if (newData.productId && !merged.productId) merged.productId = newData.productId;
    }

    // Always add URL if provided
    if (newData.url && !merged.url) {
      merged.url = newData.url;
    }

    // Update verification status
    if (newData.verified && !merged.verified) {
      merged.verified = true;
    }

    // Update last modified date
    merged.lastModified = new Date().toISOString();

    return merged;
  }

  /**
   * Get source priority (lower = higher priority)
   */
  getSourcePriority(source) {
    const index = this.prioritySources.indexOf(source);
    return index === -1 ? 999 : index;
  }

  /**
   * Deduplicate array of entries
   */
  deduplicate(entries, keyFn = (e) => e.name) {
    const seen = new Map();
    const result = [];

    for (const entry of entries) {
      const key = keyFn(entry);
      
      if (!seen.has(key)) {
        seen.set(key, entry);
        result.push(entry);
      } else {
        // Merge with existing
        const existing = seen.get(key);
        const merged = this.merge(existing, entry, entry.source);
        seen.set(key, merged);
      }
    }

    return result;
  }

  /**
   * Categorize entries
   */
  categorize(entries) {
    const categories = {};

    for (const entry of entries) {
      const category = entry.category || 'unknown';
      
      if (!categories[category]) {
        categories[category] = [];
      }
      
      categories[category].push(entry);
    }

    return categories;
  }

  /**
   * Sort entries by various criteria
   */
  sort(entries, by = 'name') {
    const sortFns = {
      name: (a, b) => a.name.localeCompare(b.name),
      vendor: (a, b) => (a.vendor || '').localeCompare(b.vendor || ''),
      category: (a, b) => (a.category || '').localeCompare(b.category || ''),
      date: (a, b) => new Date(b.addedDate || 0) - new Date(a.addedDate || 0),
      verified: (a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0)
    };

    return entries.sort(sortFns[by] || sortFns.name);
  }
}

export default DataMerger;
