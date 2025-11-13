/**
 * Calculate Euclidean distance between two face descriptors
 * Lower distance means more similar faces
 */
export function euclideanDistance(descriptor1: number[], descriptor2: number[]): number {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Descriptors must have the same length');
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Find the best matching face descriptor from stored descriptors
 * Returns the minimum distance and whether it's below the threshold
 */
export function findBestMatch(
  inputDescriptor: number[],
  storedDescriptors: number[][],
  threshold: number = 0.6
): { distance: number; isMatch: boolean } {
  if (!storedDescriptors || storedDescriptors.length === 0) {
    return { distance: Infinity, isMatch: false };
  }

  let minDistance = Infinity;
  const EARLY_EXIT_THRESHOLD = 0.3; // If we find a very close match, stop early

  for (const storedDescriptor of storedDescriptors) {
    try {
      // Ensure storedDescriptor is an array of numbers
      if (!Array.isArray(storedDescriptor) || storedDescriptor.length !== inputDescriptor.length) {
        continue;
      }
      
      // Convert to numbers if needed (optimized - only parse if needed)
      let normalizedDescriptor: number[];
      if (storedDescriptor.every(d => typeof d === 'number')) {
        normalizedDescriptor = storedDescriptor as number[];
      } else {
        normalizedDescriptor = storedDescriptor.map(d => typeof d === 'number' ? d : parseFloat(d));
      }
      
      const distance = euclideanDistance(inputDescriptor, normalizedDescriptor);
      if (distance < minDistance) {
        minDistance = distance;
        
        // Early exit if we found a very good match
        if (minDistance <= EARLY_EXIT_THRESHOLD) {
          break;
        }
      }
    } catch (err) {
      continue;
    }
  }

  return {
    distance: minDistance,
    isMatch: minDistance <= threshold
  };
}

/**
 * Calculate average descriptor from multiple descriptors
 * This can be used to create a more robust face template
 */
export function averageDescriptor(descriptors: number[][]): number[] {
  if (!descriptors || descriptors.length === 0) {
    throw new Error('Descriptors array cannot be empty');
  }

  const length = descriptors[0].length;
  const average = new Array(length).fill(0);

  for (const descriptor of descriptors) {
    if (descriptor.length !== length) {
      throw new Error('All descriptors must have the same length');
    }
    for (let i = 0; i < length; i++) {
      average[i] += descriptor[i];
    }
  }

  // Calculate average
  for (let i = 0; i < length; i++) {
    average[i] /= descriptors.length;
  }

  return average;
}

